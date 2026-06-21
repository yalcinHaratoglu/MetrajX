from rest_framework import status
from rest_framework.response import Response

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_UPLOAD_MB = 10
UPLOAD_TOO_LARGE_MESSAGE = f"Dosya boyutu en fazla {MAX_UPLOAD_MB} MB olabilir."


def is_upload_too_large(upload) -> bool:
    return upload.size > MAX_UPLOAD_BYTES


def upload_too_large_response() -> Response:
    return Response({"detail": UPLOAD_TOO_LARGE_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)
