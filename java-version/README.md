# Self-Healing Distributed Cache

Partitioned in-memory distributed cache implemented with Java and Spring Boot. Features process supervision with automatic respawn, consistent hash ring key distribution with primary-replica replication, and JWT authentication backed by PostgreSQL.

---

## Architecture

The project consists of two modules:
- `manager`: Orchestrator service running on port 3000. Handles user authentication, consistent hashing, request routing to nodes, and child process lifecycle management.
- `node`: Worker cache node running in individual processes (ports 3001, 3002, 3003). Stores entries in memory with optional TTL eviction.

```mermaid
flowchart TD
    Client(["HTTP Client / Frontend"]) -->|REST API on :3000| Manager["Manager Service (:3000)"]

    subgraph Security ["Database & Security"]
        Manager <-->|PostgreSQL (:5432)| Postgres[("PostgreSQL")]
    end

    subgraph ProcessManagement ["Child Processes"]
        Manager -.->|ProcessBuilder / onExit| Node1["NODE-01 (:3001)"]
        Manager -.->|ProcessBuilder / onExit| Node2["NODE-02 (:3002)"]
        Manager -.->|ProcessBuilder / onExit| Node3["NODE-03 (:3003)"]
    end

    subgraph Routing ["Consistent Hash Ring"]
        Manager -->|Primary / Replica HTTP| Node1
        Manager -->|Primary / Replica HTTP| Node2
        Manager -->|Primary / Replica HTTP| Node3
    end
```

---

## How It Works

### Consistent Hashing Ring
Cache keys are routed to nodes based on a rolling polynomial hash computed from the authenticated username:
$$\text{Hash} = \left(\sum_{i=0}^{n-1} \text{char}[i] \times 11^{i+1}\right) \pmod 3 + 1$$
- **Primary Node**: Node matching hash index (`1`, `2`, or `3`).
- **Replica Node**: Next node in the ring: `(primaryIndex + 1) % 3`.

### Replication & Failover
- **Write (`POST /cache/put`)**: Written to primary node. A replica copy is forwarded to the replica node.
- **Read (`GET /cache/get/{key}`)**: Reads from primary first; if primary fails or is unreachable, falls back to replica.
- **Delete (`DELETE /cache/delete/{key}`)**: Deletes key from both primary and replica.

### Process Management & Self-Healing
- On startup, the manager spawns three node instances via `ProcessBuilder` and records their PIDs to `active_nodes.json`.
- When a node process terminates unexpectedly, `Process.onExit()` triggers a restart after a 5-second delay.
- Requests during recovery employ an 8-second retry window before reporting failure.

---

## Prerequisites

- Java 21+
- PostgreSQL running on `localhost:5432`

---

## Setup & Running

### 1. Database Configuration
Create the database:
```sql
CREATE DATABASE postgress;
```

Update `manager/src/main/resources/application.properties` if your PostgreSQL credentials differ:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/postgress
spring.datasource.username=admin
spring.datasource.password=admin123
jwt.secret=your_super_secret_key_at_least_32_chars_long
```

### 2. Build the Cache Node JAR
```bash
cd node
./mvnw package -DskipTests
```
On Windows:
```powershell
cd node
.\mvnw.cmd package -DskipTests
```

### 3. Run the Manager Application
```bash
cd ../manager
./mvnw spring-boot:run
```
On Windows:
```powershell
cd ..\manager
.\mvnw.cmd spring-boot:run
```

The manager starts on port 3000 and automatically launches nodes on ports 3001, 3002, and 3003.

---

## API Endpoints

### Manager (`http://localhost:3000`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Health check | No |
| `GET` | `/status` | Active cluster nodes | No |
| `POST` | `/user/register` | Register user account | No |
| `POST` | `/user/login` | Log in and get JWT token | No |
| `POST` | `/cache/put` | Insert key-value pair | Yes |
| `GET` | `/cache/get/{key}` | Retrieve key value | Yes |
| `DELETE` | `/cache/delete/{key}` | Delete key | Yes |

### Worker Nodes (`:3001`, `:3002`, `:3003`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Node health and metrics |
| `GET` | `/info` | Node ID, port, status |
| `GET` | `/get-all` | List all keys (optional `?type=primary` or `?type=replica`) |
| `POST` | `/put` | Insert key-value directly |
| `POST` | `/put-all` | Bulk copy replica keys |
| `DELETE` | `/delete/{key}` | Delete key from node |

---

## Example Requests

### Register
```bash
curl -X POST http://localhost:3000/user/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secretPassword123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secretPassword123"}'
```

### Store Value
```bash
curl -X POST http://localhost:3000/cache/put \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"key":"theme","value":"dark"}'
```

### Get Value
```bash
curl -X GET http://localhost:3000/cache/get/theme \
  -H "Authorization: Bearer <TOKEN>"
```

### Delete Value
```bash
curl -X DELETE http://localhost:3000/cache/delete/theme \
  -H "Authorization: Bearer <TOKEN>"
```

### Check Cluster Status
```bash
curl -X GET http://localhost:3000/status
```

---

## Simulating Failover

1. Put a key into cache:
   ```bash
   curl -X POST http://localhost:3000/cache/put \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{"key":"session:1","value":"active"}'
   ```
2. Kill the primary node process (check PID in `active_nodes.json`):
   - Windows: `Stop-Process -Id <PID> -Force`
   - Linux/macOS: `kill -9 <PID>`
3. Query the key immediately:
   ```bash
   curl -X GET http://localhost:3000/cache/get/session:1 \
     -H "Authorization: Bearer <TOKEN>"
   ```
   The manager retrieves the value from the replica node while automatically scheduling a node respawn.
