from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from datetime import datetime, timedelta

from fastmcp import FastMCP
from dotenv import load_dotenv
from serpapi import GoogleSearch

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp_server")

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar",
]

TOKEN_PATH = "token.json"
CREDENTIALS_PATH = os.getenv("GOOGLE_CLIENT_SECRETS", "credentials.json")


def _get_google_creds() -> Credentials:
    """Devuelve credenciales válidas, refrescando o solicitando OAuth si hace falta."""
    creds: Credentials | None = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, GOOGLE_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    "No se encontró credentials.json. Descárgalo desde Google Cloud Console "
                    "y pon su ruta en la variable GOOGLE_CLIENT_SECRETS."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, GOOGLE_SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w", encoding="utf-8") as token:
            token.write(creds.to_json())
    return creds


# ---------------------------------------------------------------------------
# Servidor MCP
# ---------------------------------------------------------------------------

mcp = FastMCP("workspace_tools")


# ---------------------------------------------------------------------------
# Herramientas – SerpAPI Web Search
# ---------------------------------------------------------------------------

@mcp.tool()
async def web_search(query: str, num_results: int = 10) -> list[dict]:
    """Busca en la web usando SerpAPI."""

    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise RuntimeError("Define SERPAPI_KEY en tu .env o variables de entorno")

    params = {"q": query, "api_key": api_key, "num": num_results}
    search = GoogleSearch(params)
    result = search.get_dict()
    organic = result.get("organic_results", [])
    return [
        {
            "title": item.get("title"),
            "snippet": item.get("snippet"),
            "link": item.get("link"),
        }
        for item in organic[:num_results]
    ]


# ---------------------------------------------------------------------------
# Herramientas – Gmail
# ---------------------------------------------------------------------------

@mcp.tool()
async def gmail_send(to: str, subject: str, body: str) -> str:
    """Envía un correo electrónico usando la cuenta Gmail autenticada."""
    creds = _get_google_creds()
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)

    message_raw = base64.urlsafe_b64encode(
        f"From: me\nTo: {to}\nSubject: {subject}\n\n{body}".encode("utf-8")
    ).decode("utf-8")
    message = {"raw": message_raw}
    sent = service.users().messages().send(userId="me", body=message).execute()
    return sent.get("id")


@mcp.tool()
async def gmail_list_threads(label: str = "INBOX", limit: int = 10) -> list[dict]:
    """Lista los últimos hilos de Gmail en la etiqueta indicada."""
    creds = _get_google_creds()
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    threads = (
        service.users()
        .threads()
        .list(userId="me", labelIds=[label], maxResults=limit)
        .execute()
        .get("threads", [])
    )
    return threads


# ---------------------------------------------------------------------------
# Herramientas – Google Sheets
# ---------------------------------------------------------------------------

@mcp.tool()
async def sheets_read(spreadsheet_id: str, range_: str) -> list[list[str]]:
    """Lee valores de un rango de Google Sheets."""
    creds = _get_google_creds()
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    result = (
        service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range_).execute()
    )
    return result.get("values", [])


@mcp.tool()
async def sheets_write(spreadsheet_id: str, range_: str, values: list[list[str]]) -> str:
    """Escribe valores en un rango de Google Sheets."""
    creds = _get_google_creds()
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    body = {"values": values}
    result = (
        service.spreadsheets()
        .values()
        .update(spreadsheetId=spreadsheet_id, range=range_, valueInputOption="RAW", body=body)
        .execute()
    )
    return f"{result.get('updatedCells', 0)} celdas actualizadas"


# ---------------------------------------------------------------------------
# Herramientas – Google Calendar
# ---------------------------------------------------------------------------

@mcp.tool()
async def calendar_create_event(
    summary: str,
    start: str,
    end: str,
    calendar_id: str = "primary",
    timezone: str = "Europe/Madrid",
) -> str:
    """Crea un evento en Google Calendar."""
    creds = _get_google_creds()
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    event_body = {
        "summary": summary,
        "start": {"dateTime": start, "timeZone": timezone},
        "end": {"dateTime": end, "timeZone": timezone},
    }
    created = service.events().insert(calendarId=calendar_id, body=event_body).execute()
    return created.get("htmlLink")


@mcp.tool()
async def calendar_list_events(calendar_id: str = "primary", days: int = 7) -> list[dict]:
    """Lista los próximos eventos en el calendario."""
    creds = _get_google_creds()
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    now = datetime.utcnow().isoformat() + "Z"
    future = (datetime.utcnow() + timedelta(days=days)).isoformat() + "Z"
    events_result = (
        service.events()
        .list(
            calendarId=calendar_id,
            timeMin=now,
            timeMax=future,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    return events_result.get("items", [])


# ---------------------------------------------------------------------------
# Main – arranque del servidor
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="MCP server: Google Workspace + SerpAPI")
    parser.add_argument(
        "--transport",
        default="sse",
        choices=["stdio", "sse", "streamable-http"],
        help="Transporte: stdio | sse | streamable-http",
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=7000)
    args = parser.parse_args()

    if args.transport == "stdio":
        mcp.run(transport="stdio")
    else:
        mcp.run(transport=args.transport, host=args.host, port=args.port)

