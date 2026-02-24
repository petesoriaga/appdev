package com.snapqueue.app.data;

import android.net.Uri;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.snapqueue.app.model.Payment;
import com.snapqueue.app.model.Reservation;
import com.snapqueue.app.model.User;

import java.util.HashMap;
import java.util.Map;

public class FirebaseRepository {
    private final FirebaseAuth auth = FirebaseAuth.getInstance();
    private final FirebaseFirestore firestore = FirebaseFirestore.getInstance();
    private final FirebaseStorage storage = FirebaseStorage.getInstance();

    public CollectionReference users() { return firestore.collection("users"); }
    public CollectionReference reservations() { return firestore.collection("reservations"); }
    public CollectionReference payments() { return firestore.collection("payments"); }
    public CollectionReference gallery() { return firestore.collection("galleryItems"); }
    public CollectionReference chatbot() { return firestore.collection("chatbotQAs"); }
    public CollectionReference contacts() { return firestore.collection("contactMessages"); }

    public FirebaseUser currentUser() { return auth.getCurrentUser(); }

    public void register(String name, String email, String password, final OnSuccessListener<String> onSuccess, final OnFailureListener onFailure) {
        auth.createUserWithEmailAndPassword(email, password)
                .addOnSuccessListener(result -> {
                    String uid = result.getUser().getUid();
                    User user = new User(uid, name, email, "user");
                    users().document(uid).set(user)
                            .addOnSuccessListener(unused -> onSuccess.onSuccess(uid))
                            .addOnFailureListener(onFailure);
                })
                .addOnFailureListener(onFailure);
    }

    public void login(String email, String password, OnSuccessListener<String> onSuccess, OnFailureListener onFailure) {
        auth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener(result -> onSuccess.onSuccess(result.getUser().getUid()))
                .addOnFailureListener(onFailure);
    }

    public void createReservation(Reservation reservation, OnSuccessListener<DocumentReference> onSuccess, OnFailureListener onFailure) {
        reservation.status = "pending";
        reservations().add(reservation).addOnSuccessListener(onSuccess).addOnFailureListener(onFailure);
    }

    public void submitPayment(Payment payment, Uri proofUri, OnSuccessListener<String> onSuccess, OnFailureListener onFailure) {
        StorageReference ref = storage.getReference("payment_proofs/" + System.currentTimeMillis() + ".jpg");
        ref.putFile(proofUri)
                .continueWithTask(task -> ref.getDownloadUrl())
                .addOnSuccessListener(uri -> {
                    payment.proofUrl = uri.toString();
                    payment.status = "pending";
                    payments().add(payment).addOnSuccessListener(doc -> onSuccess.onSuccess(doc.getId())).addOnFailureListener(onFailure);
                })
                .addOnFailureListener(onFailure);
    }

    public void setReservationStatus(String reservationId, String status) {
        Map<String, Object> update = new HashMap<>();
        update.put("status", status);
        reservations().document(reservationId).update(update);
    }

    public void setPaymentStatus(String paymentId, String status) {
        Map<String, Object> update = new HashMap<>();
        update.put("status", status);
        payments().document(paymentId).update(update);
    }
}
