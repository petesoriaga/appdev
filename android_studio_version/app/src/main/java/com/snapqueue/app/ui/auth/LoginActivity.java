package com.snapqueue.app.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.snapqueue.app.R;
import com.snapqueue.app.data.FirebaseRepository;
import com.snapqueue.app.ui.admin.AdminDashboardActivity;
import com.snapqueue.app.ui.user.DashboardActivity;

public class LoginActivity extends AppCompatActivity {
    private final FirebaseRepository repo = new FirebaseRepository();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        EditText email = findViewById(R.id.etEmail);
        EditText password = findViewById(R.id.etPassword);
        Button login = findViewById(R.id.btnLogin);
        TextView register = findViewById(R.id.tvRegister);

        login.setOnClickListener(v -> repo.login(email.getText().toString().trim(), password.getText().toString().trim(), uid ->
                repo.users().document(uid).get().addOnSuccessListener(doc -> {
                    String role = doc.getString("role");
                    Intent target = new Intent(this, "admin".equals(role) ? AdminDashboardActivity.class : DashboardActivity.class);
                    startActivity(target);
                    finish();
                }), e -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show()));

        register.setOnClickListener(v -> startActivity(new Intent(this, RegisterActivity.class)));
    }
}
