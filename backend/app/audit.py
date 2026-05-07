"""
Audit logging helper functions for AION v2.0

This module provides utilities for creating audit log entries that track
administrative actions across the system.

Feature: ai-hub-v2
Requirements: 1.1, 1.2, 1.3, 1.4
"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog
from typing import Optional, Dict, Any


async def create_audit_log(
    db: AsyncSession,
    actor_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    detail: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Create an audit log entry within an existing database transaction.
    
    This function is designed to be called within an existing transaction context,
    allowing audit logs to be rolled back if the main operation fails.
    
    Args:
        db: Active database session (transaction)
        actor_id: ID of the user performing the action (can be None for system actions)
        action: Type of action performed (e.g., 'create', 'update', 'delete', 'upload', 'bulk_action')
        entity_type: Type of entity affected (e.g., 'user', 'agent', 'group', 'document')
        entity_id: ID of the affected entity (optional)
        detail: Additional details about the action as a JSON-serializable dict (optional)
    
    Returns:
        The created AuditLog instance
    
    Example:
        ```python
        # Within a route handler with an active transaction
        async with db.begin():
            # Perform main operation
            new_user = User(email="test@example.com", ...)
            db.add(new_user)
            await db.flush()  # Get the ID
            
            # Log the action
            await create_audit_log(
                db=db,
                actor_id=current_user.id,
                action="create",
                entity_type="user",
                entity_id=new_user.id,
                detail={"email": new_user.email, "role": new_user.role.value}
            )
            
            await db.commit()  # Commits both user and audit log
        ```
    
    Validates: Requirements 1.1, 1.2, 1.3, 1.4
    """
    audit_log = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail or {}
    )
    
    db.add(audit_log)
    # Note: We don't commit here - the caller manages the transaction
    # This allows the audit log to be rolled back if the main operation fails
    
    return audit_log
