package com.snapqueue.app.ui.admin;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.snapqueue.app.R;
import com.snapqueue.app.adapter.AdminReservationAdapter;
import com.snapqueue.app.data.FirebaseRepository;
import com.snapqueue.app.model.Reservation;

import java.util.ArrayList;
import java.util.List;

public class AdminDashboardActivity extends AppCompatActivity {
    private final FirebaseRepository repo = new FirebaseRepository();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        RecyclerView list = findViewById(R.id.rvAllReservations);
        List<Reservation> reservations = new ArrayList<>();
        AdminReservationAdapter adapter = new AdminReservationAdapter(reservations, status -> repo.setReservationStatus(status.reservationId, status.newStatus));
        list.setLayoutManager(new LinearLayoutManager(this));
        list.setAdapter(adapter);

        repo.reservations().addSnapshotListener((value, error) -> {
            reservations.clear();
            if (value != null) {
                for (var doc : value.getDocuments()) {
                    Reservation reservation = doc.toObject(Reservation.class);
                    if (reservation != null) { reservation.id = doc.getId(); reservations.add(reservation); }
                }
            }
            adapter.notifyDataSetChanged();
        });
    }
}
