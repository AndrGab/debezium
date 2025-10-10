import re

from fastapi import APIRouter, Query, WebSocket
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect

from app.internal.connection_manager import ConnectionManager

router = APIRouter(prefix='/ws')


manager = ConnectionManager()


def validate_nickname(nickname: str) -> tuple[bool, str]:
    """Validate nickname according to rules"""
    if not nickname or len(nickname.strip()) == 0:
        return False, 'Nickname cannot be empty'

    nickname = nickname.strip()

    if len(nickname) > 20:
        return False, 'Nickname must be 20 characters or less'

    if len(nickname) < 2:
        return False, 'Nickname must be at least 2 characters'

    # Allow alphanumeric, spaces, underscores, and hyphens
    if not re.match(r'^[a-zA-Z0-9_ -]+$', nickname):
        return False, 'Nickname can only contain letters, numbers, spaces, underscores, and hyphens'

    if manager.is_nickname_taken(nickname):
        return False, 'Nickname is already taken'

    return True, nickname


@router.websocket('/{client_id}')
async def websocket_endpoint(websocket: WebSocket, client_id: str, nickname: str = Query(None)):
    # Validate nickname if provided
    validated_nickname = None
    if nickname:
        is_valid, result = validate_nickname(nickname)
        if is_valid:
            validated_nickname = result
        else:
            await websocket.close(code=1008, reason=result)
            return

    await manager.connect(websocket, client_id, validated_nickname)
    try:
        while True:
            data = await websocket.receive_text()

            # Get the sender's nickname
            sender_name = manager.get_nickname(websocket)
            message = f'{sender_name}: {data}'
            await manager.broadcast(message)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, client_id)


@router.get('/metrics')
async def get_metrics():
    """Get real-time system metrics"""
    # Fetch Kafka topics count (async call)
    await manager.fetch_kafka_topics_count()
    metrics = manager.get_metrics()
    return JSONResponse(content=metrics)
