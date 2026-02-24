package com.example.snapqueue

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.snapqueue.ui.theme.SnapQueueTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SnapQueueTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SnapQueueApp()
                }
            }
        }
    }
}

@Composable
fun SnapQueueApp() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "home") {
        composable("home") { /* HomePage() */ }
        composable("gallery") { /* GalleryPage() */ }
        composable("login") { /* LoginPage() */ }
        composable("reservation") { /* ReservationPage() */ }
        composable("payment") { /* PaymentPage() */ }
        composable("dashboard") { /* DashboardPage() */ }
        composable("admin") { /* AdminPage() */ }
    }
}
