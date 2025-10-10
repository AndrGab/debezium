import time
from collections import deque

from aiokafka.admin import AIOKafkaAdminClient
from fastapi import WebSocket


class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        return cls._instances[cls]


class ConnectionManager(metaclass=SingletonMeta):
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.nicknames: dict[WebSocket, str] = {}  # Store websocket -> nickname mapping

        # Metrics tracking
        self.message_timestamps = deque(maxlen=1000)  # Track last 1000 message timestamps
        self.cdc_events = {'create': 0, 'update': 0, 'delete': 0, 'snapshot': 0}
        self.cdc_events_24h = deque(maxlen=10000)  # Store events with timestamps for 24h tracking
        self.total_messages = 0
        self.start_time = time.time()
        self.kafka_topics_count = 0  # Track Kafka topics count
        self.kafka_bootstrap_servers = 'kafka-debezium:9092'  # Default Kafka server

        # Throughput tracking
        self.cdc_event_timestamps = deque(maxlen=1000)  # CDC events with timestamps for events/sec
        self.bytes_transferred = deque(maxlen=1000)  # Bytes with timestamps for bytes/sec tracking

    async def connect(self, websocket: WebSocket, client_id: str, nickname: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Store nickname for this connection
        if nickname:
            self.nicknames[websocket] = nickname
            await self.broadcast(f'🎉 {nickname} joined the chat')
        else:
            await self.broadcast(f'Client {client_id} joined the chat')

    async def disconnect(self, websocket: WebSocket, client_id: str):
        nickname = self.nicknames.get(websocket, f'Client {client_id}')
        self.active_connections.remove(websocket)

        # Remove nickname mapping
        if websocket in self.nicknames:
            del self.nicknames[websocket]

        await self.broadcast(f'👋 {nickname} left the chat')

    async def broadcast(self, message: str):
        # Track message for metrics
        current_time = time.time()
        self.message_timestamps.append(current_time)
        self.total_messages += 1

        # Track bytes transferred (message size in bytes)
        message_bytes = len(message.encode('utf-8'))
        self.bytes_transferred.append({'bytes': message_bytes, 'timestamp': current_time})

        # Track CDC events
        if '[Created]' in message or 'Created' in message:
            self.cdc_events['create'] += 1
            self.cdc_events_24h.append({'type': 'create', 'timestamp': current_time})
            self.cdc_event_timestamps.append(current_time)
        elif '[Updated]' in message or 'Updated' in message:
            self.cdc_events['update'] += 1
            self.cdc_events_24h.append({'type': 'update', 'timestamp': current_time})
            self.cdc_event_timestamps.append(current_time)
        elif '[Deleted]' in message or 'Deleted' in message:
            self.cdc_events['delete'] += 1
            self.cdc_events_24h.append({'type': 'delete', 'timestamp': current_time})
            self.cdc_event_timestamps.append(current_time)
        elif '[Snapshot]' in message or 'Snapshot' in message:
            self.cdc_events['snapshot'] += 1
            self.cdc_events_24h.append({'type': 'snapshot', 'timestamp': current_time})
            self.cdc_event_timestamps.append(current_time)

        for connection in self.active_connections:
            await connection.send_text(message)

    def is_nickname_taken(self, nickname: str) -> bool:
        """Check if nickname is already in use"""
        return nickname.lower() in [n.lower() for n in self.nicknames.values()]

    def get_nickname(self, websocket: WebSocket) -> str:
        """Get nickname for a websocket connection"""
        return self.nicknames.get(websocket, 'Anonymous')

    async def fetch_kafka_topics_count(self) -> int:
        """Fetch the current count of Kafka topics"""
        try:
            admin_client = AIOKafkaAdminClient(bootstrap_servers=self.kafka_bootstrap_servers)
            await admin_client.start()
            try:
                # Get list of all topics
                topics = await admin_client.list_topics()
                # Filter out internal topics (those starting with __)
                user_topics = [topic for topic in topics if not topic.startswith('__')]
                self.kafka_topics_count = len(user_topics)
                return self.kafka_topics_count
            finally:
                await admin_client.close()
        except Exception as e:
            print(f'Error fetching Kafka topics: {e}')
            # Return cached value or 0 if never fetched
            return self.kafka_topics_count

    def get_metrics(self) -> dict:
        """Get current system metrics"""
        current_time = time.time()

        # Calculate messages per minute (last 60 seconds)
        one_minute_ago = current_time - 60
        recent_messages = sum(1 for ts in self.message_timestamps if ts >= one_minute_ago)

        # Calculate CDC events per second (last 60 seconds)
        cdc_events_last_minute = sum(1 for ts in self.cdc_event_timestamps if ts >= one_minute_ago)
        cdc_events_per_sec = round(cdc_events_last_minute / 60, 2) if cdc_events_last_minute > 0 else 0

        # Calculate bytes per second (last 60 seconds)
        bytes_last_minute = sum(item['bytes'] for item in self.bytes_transferred if item['timestamp'] >= one_minute_ago)
        bytes_per_sec = round(bytes_last_minute / 60, 2) if bytes_last_minute > 0 else 0

        # Calculate events in last 24 hours by type
        twenty_four_hours_ago = current_time - (24 * 60 * 60)
        events_24h = [e for e in self.cdc_events_24h if e['timestamp'] >= twenty_four_hours_ago]

        events_24h_by_type = {
            'create': sum(1 for e in events_24h if e['type'] == 'create'),
            'update': sum(1 for e in events_24h if e['type'] == 'update'),
            'delete': sum(1 for e in events_24h if e['type'] == 'delete'),
            'snapshot': sum(1 for e in events_24h if e['type'] == 'snapshot'),
        }

        # Calculate uptime
        uptime_seconds = int(current_time - self.start_time)

        return {
            'connected_users': len(self.active_connections),
            'messages_per_minute': recent_messages,
            'total_messages': self.total_messages,
            'cdc_events': self.cdc_events,
            'events_24h': events_24h_by_type,
            'uptime_seconds': uptime_seconds,
            'active_nicknames': list(self.nicknames.values()),
            'kafka_topics': self.kafka_topics_count,
            'cdc_events_per_sec': cdc_events_per_sec,
            'bytes_per_sec': bytes_per_sec,
        }
