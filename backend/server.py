from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from starlette.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import jwt, JWTError
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timedelta, date
from pathlib import Path
from dotenv import load_dotenv
import uuid
import os
import logging

# ------------------------------
# CONFIG & DATABASE
# ------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

APP_TITLE = "SMPJ - Sistem Manajemen Pegawai & Jadwal"
app = FastAPI(title=APP_TITLE)
router = APIRouter(prefix="/api")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "devsecret")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = int(os.environ.get("JWT_EXPIRE_MIN", 480))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ------------------------------
# SECURITY & AUTH
# ------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MIN)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

# ------------------------------
# MODELS
# ------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Literal["owner","supervisor","employee"]
    name: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    name: str
    role: Literal["owner","supervisor","employee"]
    password_hash: str

class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama: str
    jabatan: str
    telepon: str
    status: Literal["Aktif","Nonaktif"] = "Aktif"
    hourly_rate: int = 20000

class EmployeeUpdate(BaseModel):
    nama: Optional[str] = None
    jabatan: Optional[str] = None
    telepon: Optional[str] = None
    status: Optional[Literal["Aktif","Nonaktif"]] = None
    hourly_rate: Optional[int] = None

class Schedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    tanggal: str  # YYYY-MM-DD
    shift: Literal["Pagi","Siang","Malam"]
    jam_mulai: str  # HH:MM
    jam_selesai: str  # HH:MM

class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    tanggal: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "Belum Hadir"
    tips: int = 0

class OwnerSummary(BaseModel):
    total_employees: int
    attendance_this_month: int
    total_payroll: int
    attendance_trend: List[int]
    shift_composition: List[int]

# ------------------------------
# HELPERS
# ------------------------------
async def get_user_by_username(username: str) -> Optional[User]:
    doc = await db.users.find_one({"username": username})
    return User(**doc) if doc else None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        username = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_user_by_username(username)
    if not user:
        raise credentials_exception
    return user

def require_role(allowed: List[str]):
    async def _dep(user: User = Depends(get_current_user)):
        if user.role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _dep

# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://0.0.0.0:3000",
        "http://127.0.0.1:3001",  
        "http://localhost:3001",   
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# ROUTES
# ------------------------------
@router.get("/debug/ping")
async def ping():
    return {"ok": True, "db": DB_NAME}

@router.get("/")
async def root():
    return {"message": "SMPJ API is running", "db": DB_NAME}

@router.post("/auth/login", response_model=Token)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
):
    # 1) Coba form-url-encoded (standar OAuth2)
    username = form.username if getattr(form, "username", None) else None
    password = form.password if getattr(form, "password", None) else None

    # 2) Fallback ke JSON jika form kosong
    if not username or not password:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
            logging.info(f"🔄 Fallback JSON login body: {body}")
        except Exception:
            pass

    if not username or not password:
        logging.warning("❌ Login gagal: username/password kosong")
        raise HTTPException(status_code=400, detail="Username atau password salah")

    user = await get_user_by_username(username)
    if not user:
        logging.warning(f"❌ Login gagal: user '{username}' tidak ditemukan")
        raise HTTPException(status_code=400, detail="Username atau password salah")

    if not verify_password(password, user.password_hash):
        logging.warning(f"❌ Login gagal: password salah untuk user '{username}'")
        raise HTTPException(status_code=400, detail="Username atau password salah")

    token = create_token({"sub": user.username})
    logging.info(f"✅ Login OK: {username} ({user.role})")
    return Token(access_token=token, role=user.role, name=user.name)

# Employees CRUD
@router.get("/employees", response_model=List[Employee])
async def list_employees(user: User = Depends(get_current_user)):
    docs = await db.employees.find({}).to_list(1000)
    return [Employee(**d) for d in docs]

@router.post("/employees", response_model=Employee)
async def create_employee(emp: Employee, user: User = Depends(require_role(["owner"]))):
    await db.employees.insert_one(emp.dict())
    return emp

@router.put("/employees/{emp_id}", response_model=Employee)
async def update_employee(emp_id: str, payload: EmployeeUpdate, user: User = Depends(require_role(["owner"]))):
    doc = await db.employees.find_one({"id": emp_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    update = {k: v for k, v in payload.dict().items() if v is not None}
    doc.update(update)
    await db.employees.replace_one({"id": emp_id}, doc)
    return Employee(**doc)

@router.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str, user: User = Depends(require_role(["owner"]))):
    await db.employees.delete_one({"id": emp_id})
    return {"ok": True}

# Schedules
@router.get("/schedules", response_model=List[Schedule])
async def list_schedules(date_str: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"tanggal": date_str} if date_str else {}
    docs = await db.schedules.find(query).to_list(1000)
    return [Schedule(**d) for d in docs]

@router.post("/schedules", response_model=Schedule)
async def create_schedule(s: Schedule, user: User = Depends(require_role(["supervisor","owner"]))):
    await db.schedules.insert_one(s.dict())
    return s

@router.delete("/schedules/{sch_id}")
async def delete_schedule(sch_id: str, user: User = Depends(require_role(["supervisor","owner"]))):
    await db.schedules.delete_one({"id": sch_id})
    return {"ok": True}

# Attendance
@router.post("/attendance/checkin", response_model=Attendance)
async def check_in(payload: dict, user: User = Depends(require_role(["employee","supervisor","owner"]))):
    today = date.today().isoformat()
    now = datetime.utcnow().strftime("%H:%M:%S")
    existing = await db.attendance.find_one({"employee_id": payload["employee_id"], "tanggal": today})
    if existing:
        existing["check_in"] = now
        existing["status"] = "Hadir"
        await db.attendance.replace_one({"id": existing["id"]}, existing)
        return Attendance(**existing)
    att = Attendance(employee_id=payload["employee_id"], tanggal=today, check_in=now, status="Hadir")
    await db.attendance.insert_one(att.dict())
    return att

@router.post("/attendance/checkout", response_model=Attendance)
async def check_out(payload: dict, user: User = Depends(require_role(["employee","supervisor","owner"]))):
    today = date.today().isoformat()
    now = datetime.utcnow().strftime("%H:%M:%S")
    doc = await db.attendance.find_one({"employee_id": payload["employee_id"], "tanggal": today})
    if not doc:
        raise HTTPException(status_code=400, detail="Belum check-in")
    doc["check_out"] = now
    doc["tips"] = int(payload.get("tips", 0))
    await db.attendance.replace_one({"id": doc["id"]}, doc)
    return Attendance(**doc)

# Reports
@router.get("/reports/owner-summary", response_model=OwnerSummary)
async def summary(user: User = Depends(require_role(["owner"]))):
    total_emps = await db.employees.count_documents({})
    month_prefix = datetime.utcnow().strftime("%Y-%m")
    month_count = await db.attendance.count_documents({"tanggal": {"$regex": f"^{month_prefix}"}})

    emps = await db.employees.find({}).to_list(1000)
    rate = int(sum(e.get("hourly_rate", 20000) for e in emps) / (len(emps) or 1))
    total_payroll = month_count * 8 * rate

    trend = []
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).isoformat()
        c = await db.attendance.count_documents({"tanggal": d})
        trend.append(c)

    pagi = await db.schedules.count_documents({"shift": "Pagi"})
    siang = await db.schedules.count_documents({"shift": "Siang"})
    malam = await db.schedules.count_documents({"shift": "Malam"})

    return OwnerSummary(
        total_employees=total_emps,
        attendance_this_month=month_count,
        total_payroll=total_payroll,
        attendance_trend=trend,
        shift_composition=[pagi, siang, malam],
    )

# Register router

# === DEBUG ENDPOINT: CREATE USER MANUAL ===
# @app.post("/api/debug/create-user")
# async def create_user(payload: dict):
#     from passlib.context import CryptContext
#     pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

#     username = payload.get("username")
#     password = payload.get("password")
#     name = payload.get("name")
#     role = payload.get("role", "employee")

#     if not username or not password:
#         return {"error": "username/password required"}

#     hashed = pwd.hash(password)
#     await db.users.update_one(
#         {"username": username},
#         {"$set": {
#             "username": username,
#             "password_hash": hashed,
#             "name": name,
#             "role": role
#         }},
#         upsert=True
#     )
#     return {"ok": True, "user": username}

app.include_router(router)

# Startup/Shutdown
logging.basicConfig(level=logging.INFO)

@app.on_event("startup")
async def seed_default_users():
    count = await db.users.count_documents({})
    if count == 0:
        users = [
            User(username="owner", name="Owner", role="owner", password_hash=hash_password("password")),
            User(username="supervisor", name="Supervisor", role="supervisor", password_hash=hash_password("password")),
            User(username="employee", name="Pegawai", role="employee", password_hash=hash_password("password")),
        ]
        await db.users.insert_many([u.dict() for u in users])
        logging.info("✅ Default users seeded: owner/supervisor/employee (password: password)")

@app.on_event("shutdown")
async def close_db():
    client.close()
