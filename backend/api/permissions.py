from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, req, view):
        return bool(req.user and req.user.is_authenticated and req.user.role == 'admin')

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, req, view):
        if req.method in permissions.SAFE_METHODS:
            return True
        return bool(req.user and req.user.is_authenticated and req.user.role == 'admin')
