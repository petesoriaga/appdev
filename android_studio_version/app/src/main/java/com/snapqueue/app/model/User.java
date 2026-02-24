package com.snapqueue.app.model;

public class User {
    public String uid;
    public String fullName;
    public String email;
    public String role;

    public User() {}

    public User(String uid, String fullName, String email, String role) {
        this.uid = uid;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
    }
}
