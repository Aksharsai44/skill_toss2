import unicodedata
from pathlib import Path

from django.core.exceptions import ValidationError
from django.utils.text import get_valid_filename


MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES_PER_OWNER = 5
ALLOWED_MIME_TYPES = {
    "pdf": {"application/pdf"},
    "doc": {"application/msword"},
    "docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    "ppt": {"application/vnd.ms-powerpoint"},
    "pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation"},
    "xls": {"application/vnd.ms-excel"},
    "xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    "txt": {"text/plain"},
    "zip": {"application/zip"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "png": {"image/png"},
}


def sanitize_original_filename(name):
    normalized = unicodedata.normalize("NFKC", name or "")
    basename = Path(normalized.replace("\\", "/")).name
    safe = get_valid_filename(basename).lstrip(".")[:255]
    if not safe:
        raise ValidationError("A valid filename is required.")
    return safe


def validate_private_upload(upload):
    safe_name = sanitize_original_filename(upload.name)
    extension = Path(safe_name).suffix.lower().lstrip(".")
    if extension not in ALLOWED_MIME_TYPES:
        raise ValidationError("This file extension is not allowed.")
    if upload.size <= 0 or upload.size > MAX_FILE_SIZE:
        raise ValidationError("File must be between 1 byte and 10 MB.")
    declared_type = (getattr(upload, "content_type", "") or "").lower()
    if declared_type not in ALLOWED_MIME_TYPES[extension]:
        raise ValidationError("The declared file type does not match the filename.")

    position = upload.tell()
    header = upload.read(8192)
    upload.seek(position)
    signatures_valid = {
        "pdf": header.startswith(b"%PDF-"),
        "doc": header.startswith(bytes.fromhex("D0CF11E0A1B11AE1")),
        "ppt": header.startswith(bytes.fromhex("D0CF11E0A1B11AE1")),
        "xls": header.startswith(bytes.fromhex("D0CF11E0A1B11AE1")),
        "docx": header.startswith(b"PK\x03\x04"),
        "pptx": header.startswith(b"PK\x03\x04"),
        "xlsx": header.startswith(b"PK\x03\x04"),
        "zip": header.startswith(b"PK\x03\x04"),
        "jpg": header.startswith(b"\xff\xd8\xff"),
        "jpeg": header.startswith(b"\xff\xd8\xff"),
        "png": header.startswith(b"\x89PNG\r\n\x1a\n"),
    }
    if extension == "txt":
        try:
            header.decode("utf-8")
            signatures_valid["txt"] = b"\x00" not in header
        except UnicodeDecodeError:
            signatures_valid["txt"] = False
    if not signatures_valid.get(extension, False):
        raise ValidationError("File content does not match its allowed type.")
    return safe_name, declared_type
