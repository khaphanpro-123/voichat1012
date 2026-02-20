"""
Centralized logging utility for Railway deployment
Reduces log rate from 500+/sec to <100/sec
"""
import os
import logging
from typing import Dict, Any, Optional

# Configuration from environment
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')  # INFO for production, DEBUG for development
DEBUG_MODE = os.getenv('DEBUG_MODE', 'false').lower() == 'true'

# Configure logging format
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a module"""
    return logging.getLogger(name)

def log_summary(logger: logging.Logger, stage: str, data: Dict[str, Any]) -> None:
    """
    Log summary information only (not details)
    Use this for production to reduce log volume
    
    Example:
        log_summary(logger, "STAGE_4", {
            'total_phrases': 53,
            'filtered_phrases': 39,
            'top_5': ['phrase1', 'phrase2', ...]
        })
    """
    logger.info(f"[{stage}] {data}")

def log_debug(logger: logging.Logger, message: str, data: Optional[Any] = None) -> None:
    """
    Log debug information only if DEBUG_MODE=true
    This prevents verbose logging in production
    
    Example:
        log_debug(logger, "All candidate phrases", candidates_list)
    """
    if DEBUG_MODE:
        if data is not None:
            logger.debug(f"{message}: {data}")
        else:
            logger.debug(message)

def log_stage_start(logger: logging.Logger, stage_name: str) -> None:
    """Log the start of a pipeline stage"""
    logger.info(f"[{stage_name}] Started")

def log_stage_complete(logger: logging.Logger, stage_name: str, metrics: Dict[str, Any]) -> None:
    """
    Log stage completion with key metrics only
    
    Example:
        log_stage_complete(logger, "PHRASE_EXTRACTION", {
            'candidates': 53,
            'filtered': 39,
            'time_ms': 150
        })
    """
    logger.info(f"[{stage_name}] Complete - {metrics}")

def log_error(logger: logging.Logger, stage: str, error: Exception, context: Optional[Dict] = None) -> None:
    """
    Log errors with context
    
    Example:
        log_error(logger, "PHRASE_EXTRACTION", e, {'document_id': doc_id})
    """
    error_msg = f"[{stage}] Error: {str(error)}"
    if context:
        error_msg += f" | Context: {context}"
    logger.error(error_msg, exc_info=True)
