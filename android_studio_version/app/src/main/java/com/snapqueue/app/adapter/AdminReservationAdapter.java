package com.snapqueue.app.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.snapqueue.app.R;
import com.snapqueue.app.model.Reservation;

import java.util.List;

public class AdminReservationAdapter extends RecyclerView.Adapter<AdminReservationAdapter.VH> {
    public interface DecisionListener { void onDecision(StatusUpdate update); }

    public static class StatusUpdate {
        public final String reservationId;
        public final String newStatus;
        public StatusUpdate(String reservationId, String newStatus) {
            this.reservationId = reservationId;
            this.newStatus = newStatus;
        }
    }

    private final List<Reservation> data;
    private final DecisionListener listener;

    public AdminReservationAdapter(List<Reservation> data, DecisionListener listener) {
        this.data = data;
        this.listener = listener;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_admin_reservation, parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Reservation r = data.get(position);
        h.title.setText(r.eventType + " - " + r.eventDate);
        h.sub.setText(r.location + "\nCurrent: " + r.status);
        h.approve.setOnClickListener(v -> listener.onDecision(new StatusUpdate(r.id, "approved")));
        h.reject.setOnClickListener(v -> listener.onDecision(new StatusUpdate(r.id, "rejected")));
    }

    @Override
    public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView title, sub;
        Button approve, reject;
        VH(View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.tvTitle);
            sub = itemView.findViewById(R.id.tvSubtitle);
            approve = itemView.findViewById(R.id.btnApprove);
            reject = itemView.findViewById(R.id.btnReject);
        }
    }
}
