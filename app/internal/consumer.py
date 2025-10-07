import json

from aiokafka import AIOKafkaConsumer

from app.internal.connection_manager import ConnectionManager
from app.settings import get_settings

settings = get_settings()
manager = ConnectionManager()


class KafkaConsumer(AIOKafkaConsumer):
    def __init__(self):
        super().__init__(
            settings.kafka.topic,
            bootstrap_servers=settings.kafka.kafka_host,
            group_id=settings.kafka.group_id,
        )

    async def exec(self):
        try:
            while True:
                try:
                    async for msg in self:
                        if msg.value:
                            data = json.loads(msg.value)
                            operation = data.get('payload', {}).get('op', {})

                            message = None  # Initialize message variable to prevent UnboundLocalError

                            match operation:
                                case 'u':
                                    changes = data.get('payload', {}).get('after', {})
                                    message = f'SuperHero [Updated]: {changes}'
                                case 'c':
                                    changes = data.get('payload', {}).get('after', {})
                                    message = f'SuperHero [Created]: {changes}'
                                case 'd':
                                    changes = data.get('payload', {}).get('before', {})
                                    message = f'SuperHero [Deleted]: {changes}'
                                case 'r':
                                    # Handle initial snapshot/read operations from Debezium
                                    changes = data.get('payload', {}).get('after', {})
                                    message = f'📸 SuperHero [Snapshot]: {changes}'
                                case _:
                                    # Log unknown operation types for debugging
                                    print(f'Unknown CDC operation: {operation}')

                            # Only broadcast if we have a message to send
                            if message:
                                await manager.broadcast(message)
                except Exception as e:
                    print(e)
        finally:
            await self.stop()
