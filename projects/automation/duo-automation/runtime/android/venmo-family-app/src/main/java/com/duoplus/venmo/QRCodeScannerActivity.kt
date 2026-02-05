package com.duoplus.venmo

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.android.volley.Request
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import org.json.JSONObject
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * 📱 QR Code Scanner Activity
 * Scans DuoPlus payment QR codes and processes payments
 */
class QRCodeScannerActivity : AppCompatActivity() {
    
    private lateinit var cameraProvider: ProcessCameraProvider
    private lateinit var cameraSelector: CameraSelector
    private lateinit var imageAnalysis: ImageAnalysis
    private lateinit var preview: Preview
    private lateinit var cameraExecutor: ExecutorService
    
    private val requestQueue by lazy { Volley.newRequestQueue(this) }
    
    companion object {
        private const val TAG = "QRCodeScanner"
        private const val CAMERA_PERMISSION_REQUEST = 100
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scanner)
        
        if (checkCameraPermission()) {
            startCamera()
        } else {
            requestCameraPermission()
        }
        
        setupUI()
    }
    
    private fun setupUI() {
        // Back button
        findViewById<android.widget.ImageButton>(R.id.buttonBack).setOnClickListener {
            finish()
        }
        
        // Flash toggle
        findViewById<android.widget.ImageButton>(R.id.buttonFlash).setOnClickListener {
            toggleFlash()
        }
        
        // Manual entry button
        findViewById<Button>(R.id.buttonManualEntry).setOnClickListener {
            showManualEntryDialog()
        }
    }
    
    private fun checkCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, 
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    private fun requestCameraPermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.CAMERA),
            CAMERA_PERMISSION_REQUEST
        )
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera()
            } else {
                Toast.makeText(
                    this,
                    "Camera permission is required to scan QR codes",
                    Toast.LENGTH_LONG
                ).show()
                finish()
            }
        }
    }
    
    private fun startCamera() {
        cameraExecutor = Executors.newSingleThreadExecutor()
        
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            
            // Camera selector
            cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            
            // Preview
            preview = Preview.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_16_9)
                .build()
                .also {
                    it.setSurfaceProvider(findViewById<androidx.camera.view.PreviewView>(R.id.previewView).surfaceProvider)
                }
            
            // Image analysis for QR code scanning
            imageAnalysis = ImageAnalysis.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_16_9)
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
            
            // Set up the QR code detector
            val scanner = BarcodeScanning.getClient()
            
            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                processImageProxy(scanner, imageProxy)
            }
            
            // Unbind use cases before rebinding
            cameraProvider.unbindAll()
            
            // Bind use cases to camera
            try {
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalysis
                )
            } catch (exc: Exception) {
                Log.e(TAG, "Use case binding failed", exc)
            }
            
        }, ContextCompat.getMainExecutor(this))
    }
    
    private fun processImageProxy(
        barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
        imageProxy: ImageAnalysis.ImageProxy
    ) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = com.google.mlkit.vision.common.InputImage.fromMediaImage(
                mediaImage,
                imageProxy.imageInfo.rotationDegrees
            )
            
            barcodeScanner.process(image)
                .addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        handleQRCodeScanned(barcodes)
                    }
                }
                .addOnFailureListener { exception ->
                    Log.e(TAG, "QR code scanning failed", exception)
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
    
    private fun handleQRCodeScanned(barcodes: List<Barcode>) {
        for (barcode in barcodes) {
            val rawValue = barcode.rawValue
            if (rawValue != null && rawValue.startsWith("duoplus://pay/")) {
                Log.d(TAG, "DuoPlus QR code detected: $rawValue")
                
                // Vibrate to indicate successful scan
                val vibrator = getSystemService(android.os.Vibrator::class.java)
                if (vibrator.hasVibrator()) {
                    vibrator.vibrate(200)
                }
                
                // Process the payment
                processDuoPlusPayment(rawValue)
                
                // Stop camera to prevent multiple scans
                cameraProvider.unbindAll()
                
                break
            }
        }
    }
    
    private fun processDuoPlusPayment(qrData: String) {
        try {
            // Parse QR data: duoplus://pay/familyId/amount/recipient/description?
            val parts = qrData.removePrefix("duoplus://pay/").split("/")
            
            if (parts.size >= 3) {
                val familyId = parts[0]
                val amount = parts[1].toDoubleOrNull()
                val recipient = parts[2]
                val description = if (parts.size > 3) parts[3] else null
                
                if (amount != null && amount > 0) {
                    showPaymentConfirmationDialog(familyId, amount, recipient, description, qrData)
                } else {
                    Toast.makeText(this, "Invalid payment amount", Toast.LENGTH_SHORT).show()
                    restartCamera()
                }
            } else {
                Toast.makeText(this, "Invalid QR code format", Toast.LENGTH_SHORT).show()
                restartCamera()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing QR code", e)
            Toast.makeText(this, "Error parsing QR code", Toast.LENGTH_SHORT).show()
            restartCamera()
        }
    }
    
    private fun showPaymentConfirmationDialog(
        familyId: String,
        amount: Double,
        recipient: String,
        description: String?,
        qrData: String
    ) {
        val builder = androidx.appcompat.app.AlertDialog.Builder(this)
        
        val message = if (description != null) {
            "Send $${String.format("%.2f", amount)} to $recipient\n\nNote: $description"
        } else {
            "Send $${String.format("%.2f", amount)} to $recipient"
        }
        
        builder.setTitle("Confirm Payment")
            .setMessage(message)
            .setPositiveButton("Send") { _, _ ->
                sendPayment(familyId, amount, recipient, description, qrData)
            }
            .setNegativeButton("Cancel") { _, _ ->
                restartCamera()
            }
            .setOnCancelListener {
                restartCamera()
            }
            .show()
    }
    
    private fun sendPayment(
        familyId: String,
        amount: Double,
        recipient: String,
        description: String?,
        qrData: String
    ) {
        // Show loading
        Toast.makeText(this, "Processing payment...", Toast.LENGTH_SHORT).show()
        
        val userToken = getUserToken()
        val url = "${BuildConfig.API_BASE_URL}/api/qr/process"
        
        val paymentData = JSONObject().apply {
            put("qrData", qrData)
            put("senderEmail", getUserEmail())
            put("senderName", getUserName())
        }
        
        val request = JsonObjectRequest(
            Request.Method.POST, url, paymentData,
            { response ->
                if (response.getBoolean("success")) {
                    val transaction = response.getJSONObject("transaction")
                    handlePaymentSuccess(transaction, amount, recipient)
                } else {
                    handlePaymentError(response.getString("error"))
                }
            },
            { error ->
                handlePaymentError("Network error: ${error.message}")
            }
        )
        
        request.headers["Authorization"] = "Bearer $userToken"
        requestQueue.add(request)
    }
    
    private fun handlePaymentSuccess(transaction: JSONObject, amount: Double, recipient: String) {
        val transactionId = transaction.getString("transactionId")
        val status = transaction.getString("status")
        
        if (status == "completed") {
            // Show success dialog
            val builder = androidx.appcompat.app.AlertDialog.Builder(this)
            builder.setTitle("Payment Successful!")
                .setMessage("Successfully sent $${String.format("%.2f", amount)} to $recipient\n\nTransaction ID: $transactionId")
                .setPositiveButton("View Receipt") { _, _ ->
                    showReceipt(transaction)
                }
                .setNegativeButton("Done") { _, _ ->
                    finish()
                }
                .setOnCancelListener {
                    finish()
                }
                .show()
        } else if (status == "pending") {
            // Show approval required dialog
            val builder = androidx.appcompat.app.AlertDialog.Builder(this)
            builder.setTitle("Payment Pending Approval")
                .setMessage("Your payment of $${String.format("%.2f", amount)} to $recipient requires parental approval.\n\nTransaction ID: $transactionId")
                .setPositiveButton("OK") { _, _ ->
                    finish()
                }
                .setOnCancelListener {
                    finish()
                }
                .show()
        } else {
            handlePaymentError("Payment failed with status: $status")
        }
    }
    
    private fun handlePaymentError(error: String) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Payment Failed")
            .setMessage("Unable to complete payment: $error")
            .setPositiveButton("Try Again") { _, _ ->
                restartCamera()
            }
            .setNegativeButton("Cancel") { _, _ ->
                finish()
            }
            .setOnCancelListener {
                finish()
            }
            .show()
    }
    
    private fun showReceipt(transaction: JSONObject) {
        val intent = Intent(this, ReceiptActivity::class.java)
        intent.putExtra("transaction", transaction.toString())
        startActivity(intent)
        finish()
    }
    
    private fun restartCamera() {
        // Restart camera for next scan
        if (::cameraProvider.isInitialized) {
            try {
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalysis
                )
            } catch (exc: Exception) {
                Log.e(TAG, "Failed to restart camera", exc)
            }
        }
    }
    
    private fun toggleFlash() {
        // Implementation for flash toggle
        Toast.makeText(this, "Flash toggle not implemented", Toast.LENGTH_SHORT).show()
    }
    
    private fun showManualEntryDialog() {
        val builder = androidx.appcompat.app.AlertDialog.Builder(this)
        val inflater = layoutInflater
        val dialogView = inflater.inflate(R.layout.dialog_manual_payment, null)
        
        val amountInput = dialogView.findViewById<android.widget.EditText>(R.id.editAmount)
        val recipientInput = dialogView.findViewById<android.widget.EditText>(R.id.editRecipient)
        val noteInput = dialogView.findViewById<android.widget.EditText>(R.id.editNote)
        
        builder.setView(dialogView)
            .setTitle("Manual Payment Entry")
            .setPositiveButton("Send") { _, _ ->
                val amount = amountInput.text.toString().toDoubleOrNull()
                val recipient = recipientInput.text.toString()
                val note = noteInput.text.toString()
                
                if (amount != null && amount > 0 && recipient.isNotEmpty()) {
                    // Create manual payment
                    sendManualPayment(amount, recipient, note)
                } else {
                    Toast.makeText(this, "Please enter valid payment details", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun sendManualPayment(amount: Double, recipient: String, note: String) {
        // Implementation for manual payment
        Toast.makeText(this, "Manual payment feature coming soon", Toast.LENGTH_SHORT).show()
    }
    
    private fun getUserToken(): String {
        val prefs = getSharedPreferences("VenmoFamily", MODE_PRIVATE)
        return prefs.getString("userToken", "") ?: ""
    }
    
    private fun getUserEmail(): String {
        val prefs = getSharedPreferences("VenmoFamily", MODE_PRIVATE)
        return prefs.getString("userEmail", "") ?: ""
    }
    
    private fun getUserName(): String {
        val prefs = getSharedPreferences("VenmoFamily", MODE_PRIVATE)
        return prefs.getString("userName", "User") ?: "User"
    }
    
    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
    
    override fun onResume() {
        super.onResume()
        if (::cameraProvider.isInitialized && checkCameraPermission()) {
            restartCamera()
        }
    }
    
    override fun onPause() {
        super.onPause()
        if (::cameraProvider.isInitialized) {
            cameraProvider.unbindAll()
        }
    }
}
