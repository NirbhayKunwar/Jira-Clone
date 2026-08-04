from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully."
    data: Optional[T] = None
    code: Optional[str] = None
