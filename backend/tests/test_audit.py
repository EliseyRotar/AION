"""
Property-based tests for audit log functionality in BROWAY-AI v2.0

Feature: ai-hub-v2
Tests:
- Property 1: Ogni azione admin genera un audit log
- Property 2: Paginazione audit log corretta

Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6
"""

import pytest
import pytest_asyncio
from hypothesis import given, strategies as st, settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from httpx import AsyncClient

from app.models import User, Group, Agent, AuditLog
from tests.conftest import admin_user, regular_user, db_session, test_client


# ── Property 1: Ogni azione admin genera un audit log ────────────────────────

@pytest.mark.asyncio
@given(
    username=st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
    email_local=st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))),
)
@settings(max_examples=100, deadline=None)
async def test_property_1_admin_actions_generate_audit_logs(
    username: str,
    email_local: str,
    test_client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Feature: ai-hub-v2, Property 1: Ogni azione admin genera un audit log
    
    Property: For any admin action (create/update/delete user, group, agent, document),
    an audit log entry is created with correct actor_id, action, entity_type, and entity_id.
    
    Validates: Requirements 1.1, 1.2, 1.3, 1.4
    """
    # Get admin token
    login_response = await test_client.post("/auth/login", json={
        "email": admin_user.email,
        "password": "Admin123!"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Count audit logs before action
    count_before = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # Perform admin action: create user
    email = f"{email_local}@example.com"
    create_response = await test_client.post("/admin/users", headers=headers, json={
        "email": email,
        "username": username,
        "password": "TestPass123!",
        "role": "user"
    })
    
    # If creation failed due to duplicate or validation, skip this example
    if create_response.status_code != 200:
        return
    
    user_id = create_response.json()["id"]
    
    # Count audit logs after action
    count_after = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # Property: Exactly one audit log should be created
    assert count_after == count_before + 1, f"Expected {count_before + 1} audit logs, got {count_after}"
    
    # Verify audit log details
    result = await db_session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "user")
        .where(AuditLog.entity_id == user_id)
        .where(AuditLog.action == "create")
    )
    audit_log = result.scalar_one_or_none()
    
    assert audit_log is not None, "Audit log not found for created user"
    assert audit_log.actor_id == admin_user.id, f"Expected actor_id {admin_user.id}, got {audit_log.actor_id}"
    assert audit_log.action == "create", f"Expected action 'create', got {audit_log.action}"
    assert audit_log.entity_type == "user", f"Expected entity_type 'user', got {audit_log.entity_type}"
    assert audit_log.entity_id == user_id, f"Expected entity_id {user_id}, got {audit_log.entity_id}"
    assert "email" in audit_log.detail, "Audit log detail should contain email"
    assert audit_log.detail["email"] == email, f"Expected email {email}, got {audit_log.detail['email']}"


@pytest.mark.asyncio
async def test_property_1_update_action_generates_audit_log(
    test_client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User,
    regular_user: User
):
    """
    Feature: ai-hub-v2, Property 1: Ogni azione admin genera un audit log (update)
    
    Property: Updating a user generates an audit log with change tracking.
    
    Validates: Requirements 1.1, 1.4
    """
    # Get admin token
    login_response = await test_client.post("/auth/login", json={
        "email": admin_user.email,
        "password": "Admin123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Count audit logs before action
    count_before = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # Update user
    update_response = await test_client.put(f"/admin/users/{regular_user.id}", headers=headers, json={
        "full_name": "Updated Name"
    })
    assert update_response.status_code == 200
    
    # Count audit logs after action
    count_after = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # Property: Exactly one audit log should be created
    assert count_after == count_before + 1
    
    # Verify audit log details
    result = await db_session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "user")
        .where(AuditLog.entity_id == regular_user.id)
        .where(AuditLog.action == "update")
        .order_by(AuditLog.timestamp.desc())
    )
    audit_log = result.scalar_one_or_none()
    
    assert audit_log is not None
    assert audit_log.actor_id == admin_user.id
    assert "changes" in audit_log.detail
    assert "full_name" in audit_log.detail["changes"]


@pytest.mark.asyncio
async def test_property_1_delete_action_generates_audit_log(
    test_client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Feature: ai-hub-v2, Property 1: Ogni azione admin genera un audit log (delete)
    
    Property: Deleting a group generates an audit log with entity details.
    
    Validates: Requirements 1.1, 1.4
    """
    # Get admin token
    login_response = await test_client.post("/auth/login", json={
        "email": admin_user.email,
        "password": "Admin123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a group first
    create_response = await test_client.post("/admin/groups", headers=headers, json={
        "name": "Test Group for Deletion",
        "description": "Will be deleted",
        "color": "#ff0000"
    })
    assert create_response.status_code == 200
    group_id = create_response.json()["id"]
    
    # Count audit logs before deletion
    count_before = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # Delete group
    delete_response = await test_client.delete(f"/admin/groups/{group_id}", headers=headers)
    assert delete_response.status_code == 200
    
    # Count audit logs after deletion
    count_after = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # Property: Exactly one audit log should be created for deletion
    assert count_after == count_before + 1
    
    # Verify audit log details
    result = await db_session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "group")
        .where(AuditLog.entity_id == group_id)
        .where(AuditLog.action == "delete")
    )
    audit_log = result.scalar_one_or_none()
    
    assert audit_log is not None
    assert audit_log.actor_id == admin_user.id
    assert "name" in audit_log.detail
    assert audit_log.detail["name"] == "Test Group for Deletion"


# ── Property 2: Paginazione audit log corretta ───────────────────────────────

@pytest.mark.asyncio
@given(
    page_size=st.integers(min_value=1, max_value=20),
    num_logs=st.integers(min_value=5, max_value=50)
)
@settings(max_examples=100, deadline=None)
async def test_property_2_audit_log_pagination_correct(
    page_size: int,
    num_logs: int,
    test_client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Feature: ai-hub-v2, Property 2: Paginazione audit log corretta
    
    Property: For any page_size and total number of logs:
    1. total_pages = ceil(total / page_size)
    2. Each page contains at most page_size items
    3. Last page contains (total % page_size) or page_size items
    4. All items are unique across pages
    5. Items are ordered by timestamp descending
    
    Validates: Requirements 1.6
    """
    # Get admin token
    login_response = await test_client.post("/auth/login", json={
        "email": admin_user.email,
        "password": "Admin123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Clear existing audit logs for clean test
    await db_session.execute(select(AuditLog).where(AuditLog.id > 0))
    await db_session.execute(AuditLog.__table__.delete())
    await db_session.commit()
    
    # Create num_logs audit log entries by creating groups
    created_ids = []
    for i in range(num_logs):
        response = await test_client.post("/admin/groups", headers=headers, json={
            "name": f"Test Group {i}",
            "description": f"Group {i}",
            "color": "#00ff00"
        })
        if response.status_code == 200:
            created_ids.append(response.json()["id"])
    
    # Get total count
    total = await db_session.scalar(select(func.count()).select_from(AuditLog)) or 0
    
    # If no logs were created, skip
    if total == 0:
        return
    
    # Calculate expected total_pages
    expected_total_pages = (total + page_size - 1) // page_size
    
    # Fetch first page
    response = await test_client.get(f"/admin/audit-logs?page=1&page_size={page_size}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Property 1: total_pages calculation is correct
    assert data["total_pages"] == expected_total_pages, \
        f"Expected {expected_total_pages} pages, got {data['total_pages']}"
    
    # Property 2: First page contains at most page_size items
    assert len(data["items"]) <= page_size, \
        f"Expected at most {page_size} items, got {len(data['items'])}"
    
    # Property 3: Collect all items across all pages
    all_items = []
    all_ids = set()
    prev_timestamp = None
    
    for page in range(1, expected_total_pages + 1):
        response = await test_client.get(f"/admin/audit-logs?page={page}&page_size={page_size}", headers=headers)
        assert response.status_code == 200
        page_data = response.json()
        
        # Each page should have correct page number
        assert page_data["page"] == page
        
        # Each page except last should have page_size items
        if page < expected_total_pages:
            assert len(page_data["items"]) == page_size, \
                f"Page {page} should have {page_size} items, got {len(page_data['items'])}"
        else:
            # Last page should have remaining items
            expected_last_page_size = total - (page_size * (expected_total_pages - 1))
            assert len(page_data["items"]) == expected_last_page_size, \
                f"Last page should have {expected_last_page_size} items, got {len(page_data['items'])}"
        
        # Property 4: All items are unique
        for item in page_data["items"]:
            assert item["id"] not in all_ids, f"Duplicate item ID {item['id']} found"
            all_ids.add(item["id"])
            all_items.append(item)
            
            # Property 5: Items are ordered by timestamp descending
            current_timestamp = item["timestamp"]
            if prev_timestamp is not None:
                assert current_timestamp <= prev_timestamp, \
                    f"Items not ordered by timestamp: {current_timestamp} > {prev_timestamp}"
            prev_timestamp = current_timestamp
    
    # Property 6: Total items collected equals total
    assert len(all_items) == total, \
        f"Expected {total} total items, got {len(all_items)}"


@pytest.mark.asyncio
async def test_property_2_audit_log_filters_work_correctly(
    test_client: AsyncClient,
    db_session: AsyncSession,
    admin_user: User
):
    """
    Feature: ai-hub-v2, Property 2: Paginazione audit log corretta (with filters)
    
    Property: Filters (actor_id, entity_type, action) correctly reduce the result set.
    
    Validates: Requirements 1.5, 1.6
    """
    # Get admin token
    login_response = await test_client.post("/auth/login", json={
        "email": admin_user.email,
        "password": "Admin123!"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a user and a group to generate different entity types
    user_response = await test_client.post("/admin/users", headers=headers, json={
        "email": "filter_test@example.com",
        "username": "filtertest",
        "password": "Test123!",
        "role": "user"
    })
    
    group_response = await test_client.post("/admin/groups", headers=headers, json={
        "name": "Filter Test Group",
        "description": "For filter testing",
        "color": "#0000ff"
    })
    
    # Get all audit logs
    all_response = await test_client.get("/admin/audit-logs?page_size=100", headers=headers)
    assert all_response.status_code == 200
    all_data = all_response.json()
    total_all = all_data["total"]
    
    # Filter by entity_type=user
    user_response = await test_client.get("/admin/audit-logs?entity_type=user&page_size=100", headers=headers)
    assert user_response.status_code == 200
    user_data = user_response.json()
    
    # Property: Filtered results should be <= total results
    assert user_data["total"] <= total_all
    
    # Property: All returned items should match the filter
    for item in user_data["items"]:
        assert item["entity_type"] == "user", f"Expected entity_type 'user', got {item['entity_type']}"
    
    # Filter by action=create
    create_response = await test_client.get("/admin/audit-logs?action=create&page_size=100", headers=headers)
    assert create_response.status_code == 200
    create_data = create_response.json()
    
    # Property: All returned items should match the filter
    for item in create_data["items"]:
        assert item["action"] == "create", f"Expected action 'create', got {item['action']}"
    
    # Filter by actor_id
    actor_response = await test_client.get(f"/admin/audit-logs?actor_id={admin_user.id}&page_size=100", headers=headers)
    assert actor_response.status_code == 200
    actor_data = actor_response.json()
    
    # Property: All returned items should match the filter
    for item in actor_data["items"]:
        assert item["actor_id"] == admin_user.id, f"Expected actor_id {admin_user.id}, got {item['actor_id']}"
