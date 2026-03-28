import cloudinary
import cloudinary.uploader

from app.core.config import settings

# Configure once at import time (Singleton via module)
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


def upload_file(file, folder: str) -> dict:
    """
    Upload a file-like object to Cloudinary.

    Args:
        file: SpooledTemporaryFile or bytes from FastAPI UploadFile.read()
        folder: Destination folder inside Cloudinary (e.g. "productos").

    Returns:
        dict with keys ``cloudinary_url`` and ``cloudinary_public_id``.
    """
    result = cloudinary.uploader.upload(file, folder=folder, resource_type="auto")
    return {
        "cloudinary_url": result["secure_url"],
        "cloudinary_public_id": result["public_id"],
    }


def delete_file(public_id: str) -> None:
    """Delete an asset from Cloudinary by its public_id."""
    cloudinary.uploader.destroy(public_id, resource_type="auto")
