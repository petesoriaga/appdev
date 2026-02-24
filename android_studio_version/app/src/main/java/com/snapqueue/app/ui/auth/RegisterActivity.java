package com.snapqueue.app.ui.auth;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.snapqueue.app.R;
import com.snapqueue.app.data.FirebaseRepository;

public class RegisterActivity extends AppCompatActivity {
    private final FirebaseRepository repo = new FirebaseRepository();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        EditText name = findViewById(R.id.etName);
        EditText email = findViewById(R.id.etEmail);
        EditText password = findViewById(R.id.etPassword);
        Button register = findViewById(R.id.btnRegister);

        register.setOnClickListener(v -> repo.register(
                name.getText().toString().trim(),
                email.getText().toString().trim(),
                password.getText().toString().trim(),
                uid -> {
                    Toast.makeText(this, "Account created. Please login.", Toast.LENGTH_SHORT).show();
                    finish();
                },
                e -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show()));
    }
}
