import asyncio
import os
from typing import Optional
from functools import lru_cache
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from temporalio.api.enums.v1 import WorkflowExecutionStatus
from temporalio.client import Client
from temporalio.exceptions import TemporalError

from goals import goal_list
from models.data_types import AgentGoalWorkflowParams, CombinedInput
from shared.config import TEMPORAL_TASK_QUEUE, get_temporal_client
from workflows.agent_goal_workflow import AgentGoalWorkflow

app = FastAPI(title="Temporal AI Agent API", version="1.0.0")
temporal_client: Optional[Client] = None

# Load environment variables
load_dotenv()

# Response cache for frequently accessed data
response_cache = {}
CACHE_DURATION = 5  # seconds

def get_cache_key(endpoint: str, **kwargs) -> str:
    """Generate cache key for endpoint with parameters."""
    key_parts = [endpoint]
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}={v}")
    return ":".join(key_parts)

def is_cache_valid(timestamp: datetime) -> bool:
    """Check if cache entry is still valid."""
    return datetime.now() - timestamp < timedelta(seconds=CACHE_DURATION)

def get_cached_response(cache_key: str):
    """Get cached response if valid."""
    if cache_key in response_cache:
        data, timestamp = response_cache[cache_key]
        if is_cache_valid(timestamp):
            return data
        else:
            del response_cache[cache_key]
    return None

def set_cached_response(cache_key: str, data):
    """Set cached response with timestamp."""
    response_cache[cache_key] = (data, datetime.now())

@lru_cache(maxsize=1)
def get_initial_agent_goal():
    """Get the agent goal from environment variables with caching."""
    env_goal = os.getenv(
        "AGENT_GOAL", "goal_event_flight_invoice"
    )  # if no goal is set in the env file, default to single agent mode
    for listed_goal in goal_list:
        if listed_goal.id == env_goal:
            return listed_goal

@app.on_event("startup")
async def startup_event():
    global temporal_client
    temporal_client = await get_temporal_client()

# Add middleware for compression and CORS
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    """Add cache headers to responses."""
    response = await call_next(request)
    
    # Add cache headers for GET requests
    if request.method == "GET":
        response.headers["Cache-Control"] = "public, max-age=5"
        response.headers["ETag"] = f'"{hash(request.url)}"'
    
    return response

@app.get("/")
def root():
    return {"message": "Temporal AI Agent!"}

@app.get("/tool-data")
async def get_tool_data():
    """Calls the workflow's 'get_tool_data' query with caching."""
    cache_key = get_cache_key("tool-data")
    cached = get_cached_response(cache_key)
    if cached:
        return cached
    
    try:
        # Get workflow handle
        handle = temporal_client.get_workflow_handle("agent-workflow")

        # Check if the workflow is completed
        workflow_status = await handle.describe()
        if workflow_status.status == 2:
            # Workflow is completed; return an empty response
            result = {}
            set_cached_response(cache_key, result)
            return result

        # Query the workflow
        tool_data = await handle.query("get_latest_tool_data")
        set_cached_response(cache_key, tool_data)
        return tool_data
    except TemporalError as e:
        # Workflow not found; return an empty response
        print(e)
        result = {}
        set_cached_response(cache_key, result)
        return result

@app.get("/get-conversation-history")
async def get_conversation_history():
    """Calls the workflow's 'get_conversation_history' query with caching."""
    cache_key = get_cache_key("conversation-history")
    cached = get_cached_response(cache_key)
    if cached:
        return cached
    
    try:
        handle = temporal_client.get_workflow_handle("agent-workflow")

        failed_states = [
            WorkflowExecutionStatus.WORKFLOW_EXECUTION_STATUS_TERMINATED,
            WorkflowExecutionStatus.WORKFLOW_EXECUTION_STATUS_CANCELED,
            WorkflowExecutionStatus.WORKFLOW_EXECUTION_STATUS_FAILED,
        ]

        description = await handle.describe()
        if description.status in failed_states:
            print("Workflow is in a failed state. Returning empty history.")
            result = []
            set_cached_response(cache_key, result)
            return result

        # Set a timeout for the query
        try:
            conversation_history = await asyncio.wait_for(
                handle.query("get_conversation_history"),
                timeout=5,  # Timeout after 5 seconds
            )
            set_cached_response(cache_key, conversation_history)
            return conversation_history
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=404,
                detail="Temporal query timed out (worker may be unavailable).",
            )

    except TemporalError as e:
        error_message = str(e)
        print(f"Temporal error: {error_message}")

        # If worker is down or no poller is available, return a 404
        if "no poller seen for task queue recently" in error_message:
            raise HTTPException(
                status_code=404, detail="Workflow worker unavailable or not found."
            )

        if "workflow not found" in error_message:
            await start_workflow()
            result = []
            set_cached_response(cache_key, result)
            return result
        else:
            # For other Temporal errors, return a 500
            raise HTTPException(
                status_code=500, detail="Internal server error while querying workflow."
            )

@app.get("/agent-goal")
async def get_agent_goal():
    """Calls the workflow's 'get_agent_goal' query with caching."""
    cache_key = get_cache_key("agent-goal")
    cached = get_cached_response(cache_key)
    if cached:
        return cached
    
    try:
        # Get workflow handle
        handle = temporal_client.get_workflow_handle("agent-workflow")

        # Check if the workflow is completed
        workflow_status = await handle.describe()
        if workflow_status.status == 2:
            # Workflow is completed; return an empty response
            result = {}
            set_cached_response(cache_key, result)
            return result

        # Query the workflow
        agent_goal = await handle.query("get_agent_goal")
        set_cached_response(cache_key, agent_goal)
        return agent_goal
    except TemporalError as e:
        # Workflow not found; return an empty response
        print(e)
        result = {}
        set_cached_response(cache_key, result)
        return result

@app.post("/send-prompt")
async def send_prompt(prompt: str):
    # Clear conversation cache when sending a new prompt
    conversation_cache_key = get_cache_key("conversation-history")
    if conversation_cache_key in response_cache:
        del response_cache[conversation_cache_key]
    
    # Create combined input with goal from environment
    combined_input = CombinedInput(
        tool_params=AgentGoalWorkflowParams(None, None),
        agent_goal=get_initial_agent_goal(),
        # change to get from workflow query
    )

    workflow_id = "agent-workflow"

    # Start (or signal) the workflow
    await temporal_client.start_workflow(
        AgentGoalWorkflow.run,
        combined_input,
        id=workflow_id,
        task_queue=TEMPORAL_TASK_QUEUE,
        start_signal="user_prompt",
        start_signal_args=[prompt],
    )

    return {"message": f"Prompt '{prompt}' sent to workflow {workflow_id}."}

@app.post("/confirm")
async def send_confirm():
    """Sends a 'confirm' signal to the workflow."""
    # Clear conversation cache when confirming
    conversation_cache_key = get_cache_key("conversation-history")
    if conversation_cache_key in response_cache:
        del response_cache[conversation_cache_key]
    
    workflow_id = "agent-workflow"
    handle = temporal_client.get_workflow_handle(workflow_id)
    await handle.signal("confirm")
    return {"message": "Confirm signal sent."}

@app.post("/end-chat")
async def end_chat():
    """Sends a 'end_chat' signal to the workflow."""
    workflow_id = "agent-workflow"

    try:
        handle = temporal_client.get_workflow_handle(workflow_id)
        await handle.signal("end_chat")
        return {"message": "End chat signal sent."}
    except TemporalError as e:
        print(e)
        # Workflow not found; return an empty response
        return {}

@app.post("/start-workflow")
async def start_workflow():
    # Clear all caches when starting a new workflow
    response_cache.clear()
    
    initial_agent_goal = get_initial_agent_goal()

    # Create combined input
    combined_input = CombinedInput(
        tool_params=AgentGoalWorkflowParams(None, None),
        agent_goal=initial_agent_goal,
    )

    workflow_id = "agent-workflow"

    # Start the workflow with the starter prompt from the goal
    await temporal_client.start_workflow(
        AgentGoalWorkflow.run,
        combined_input,
        id=workflow_id,
        task_queue=TEMPORAL_TASK_QUEUE,
        start_signal="user_prompt",
        start_signal_args=["### " + initial_agent_goal.starter_prompt],
    )

    return {
        "message": f"Workflow started with goal's starter prompt: {initial_agent_goal.starter_prompt}."
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_size": len(response_cache)
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for better error responses."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )
