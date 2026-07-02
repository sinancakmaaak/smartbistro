package com.example.menu.entity;

import org.springframework.security.core.GrantedAuthority;

public enum Role implements GrantedAuthority {
    ADMIN,
    STAFF,
    USER,
    KITCHEN;

    @Override
    public String getAuthority() {
        return "ROLE_" + name();
    }
}
