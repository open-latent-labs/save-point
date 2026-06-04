import React, { createContext, useContext, useState, useCallback } from "react";

const UserRoleContext = createContext(null);

export function UserRoleProvider({ children }) {
    const [roleMap, setRoleMap] = useState({});

    const updateRole = useCallback((userId, newRole) => {
        setRoleMap((prev) => ({ ...prev, [userId]: newRole }));
    }, []);

    const getRole = useCallback(
        (user) => roleMap[user?.id] ?? user?.role ?? "USER",
        [roleMap]
    );

    return (
        <UserRoleContext.Provider value={{ roleMap, updateRole, getRole }}>
            {children}
        </UserRoleContext.Provider>
    );
}

export function useUserRole() {
    return useContext(UserRoleContext);
}
