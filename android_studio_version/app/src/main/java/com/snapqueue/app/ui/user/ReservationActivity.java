package com.snapqueue.app.ui.user;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.snapqueue.app.R;
import com.snapqueue.app.data.FirebaseRepository;
import com.snapqueue.app.model.Reservation;

public class ReservationActivity extends AppCompatActivity {
    private final FirebaseRepository repo = new FirebaseRepository();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reservation);

        EditText eventType = findViewById(R.id.etEventType);
        EditText eventDate = findViewById(R.id.etEventDate);
        EditText location = findViewById(R.id.etLocation);
        EditText notes = findViewById(R.id.etNotes);
        Button next = findViewById(R.id.btnNextToPayment);

        next.setOnClickListener(v -> {
            Reservation reservation = new Reservation();
            reservation.userId = repo.currentUser().getUid();
            reservation.eventType = eventType.getText().toString().trim();
            reservation.eventDate = eventDate.getText().toString().trim();
            reservation.location = location.getText().toString().trim();
            reservation.notes = notes.getText().toString().trim();

            repo.createReservation(reservation, doc -> {
                Intent intent = new Intent(this, PaymentActivity.class);
                intent.putExtra("reservationId", doc.getId());
                startActivity(intent);
                finish();
            }, e -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show());
        });
    }
}
