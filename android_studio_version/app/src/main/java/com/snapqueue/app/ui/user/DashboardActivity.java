package com.snapqueue.app.ui.user;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.snapqueue.app.R;
import com.snapqueue.app.adapter.ReservationAdapter;
import com.snapqueue.app.data.FirebaseRepository;
import com.snapqueue.app.model.Reservation;

import java.util.ArrayList;
import java.util.List;

public class DashboardActivity extends AppCompatActivity {
    private final FirebaseRepository repo = new FirebaseRepository();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        RecyclerView list = findViewById(R.id.rvReservations);
        Button reserve = findViewById(R.id.btnMakeReservation);
        List<Reservation> items = new ArrayList<>();
        ReservationAdapter adapter = new ReservationAdapter(items);
        list.setLayoutManager(new LinearLayoutManager(this));
        list.setAdapter(adapter);

        String uid = repo.currentUser() != null ? repo.currentUser().getUid() : "";
        repo.reservations().whereEqualTo("userId", uid).addSnapshotListener((value, error) -> {
            items.clear();
            if (value != null) {
                for (var doc : value.getDocuments()) {
                    Reservation r = doc.toObject(Reservation.class);
                    if (r != null) { r.id = doc.getId(); items.add(r); }
                }
            }
            adapter.notifyDataSetChanged();
        });

        reserve.setOnClickListener(v -> startActivity(new Intent(this, ReservationActivity.class)));
    }
}
