package com.snapqueue.app.ui.user;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.snapqueue.app.R;
import com.snapqueue.app.data.FirebaseRepository;
import com.snapqueue.app.model.Payment;

public class PaymentActivity extends AppCompatActivity {
    private final FirebaseRepository repo = new FirebaseRepository();
    private Uri proofUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_payment);

        EditText amount = findViewById(R.id.etAmount);
        Button upload = findViewById(R.id.btnUploadProof);
        Button submit = findViewById(R.id.btnSubmitPayment);

        ActivityResultLauncher<String> picker = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> proofUri = uri);
        upload.setOnClickListener(v -> picker.launch("image/*"));

        submit.setOnClickListener(v -> {
            if (proofUri == null) {
                Toast.makeText(this, "Upload payment proof first.", Toast.LENGTH_SHORT).show();
                return;
            }
            Payment payment = new Payment();
            payment.reservationId = getIntent().getStringExtra("reservationId");
            payment.userId = repo.currentUser().getUid();
            payment.amount = amount.getText().toString().trim();

            repo.submitPayment(payment, proofUri, id -> {
                startActivity(new Intent(this, DashboardActivity.class));
                finishAffinity();
            }, e -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show());
        });
    }
}
