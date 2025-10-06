from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketDisconnect

from app.internal.connection_manager import ConnectionManager

router = APIRouter(prefix='/ws')


manager = ConnectionManager()


@router.websocket('/{client_id}')
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    nickname_set = False
    
    try:
        # First message should be the nickname
        while True:
            data = await websocket.receive_text()
            
            # Handle nickname setup (first message)
            if not nickname_set:
                if data.startswith('NICKNAME:'):
                    nickname = data.replace('NICKNAME:', '').strip()
                    nickname_set = await manager.set_nickname(websocket, nickname)
                    continue
                else:
                    # If first message is not nickname, reject
                    await websocket.send_text('NICKNAME_ERROR:Please set nickname first')
                    continue
            
            # Handle regular messages after nickname is set
            nickname = manager.get_nickname(websocket)
            message = f'{nickname}: {data}'
            await manager.broadcast(message)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, client_id)
