GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_manager_of_franchise(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_member_of_franchise(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_member_of_sector(uuid, uuid) TO authenticated;