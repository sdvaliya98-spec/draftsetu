import re

def formatDateDDMMYYYY(val: str) -> str:
    """Converts ISO date/datetime format to Indian format (DD/MM/YYYY)."""
    if not val:
        return ""
    val_str = str(val).strip()
    # Matches YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", val_str):
        parts = val_str.split("-")
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    # Matches YYYY-MM-DD followed by space/T and time
    if re.match(r"^\d{4}-\d{2}-\d{2}[ T].*$", val_str):
        date_part = val_str[:10]
        parts = date_part.split("-")
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return val_str

def formatDateForDisplay(val: str) -> str:
    """Converts ISO format (YYYY-MM-DD) to Indian format (DD/MM/YYYY)."""
    return formatDateDDMMYYYY(val)

def formatDateForStorage(val: str) -> str:
    """Converts Indian format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)."""
    if not val:
        return ""
    val_str = str(val).strip()
    # Matches DD/MM/YYYY
    if re.match(r"^\d{2}/\d{2}/\d{4}$", val_str):
        parts = val_str.split("/")
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return val_str

def formatDateForDocument(val: str) -> str:
    """Formats date for document injection."""
    return formatDateDDMMYYYY(val)

