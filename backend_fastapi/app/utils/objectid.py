from bson import ObjectId
from pydantic import GetCoreSchemaHandler, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: type, _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        def validate(value: str | ObjectId) -> str:
            if isinstance(value, ObjectId):
                return str(value)
            if isinstance(value, str):
                if not ObjectId.is_valid(value):
                    raise ValueError(f"Invalid ObjectId string format: '{value}'")
                return value
            raise ValueError(f"Expected str or ObjectId, got {type(value)}")

        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.no_info_plain_validator_function(validate),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string", "example": "60c72b2f9b1d8e001c888881"}
