package com.duoplus.venmo

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import org.json.JSONArray
import org.json.JSONObject

/**
 * 🏠 Family Dashboard Activity
 * Main interface for family account management
 */
class FamilyDashboardActivity : AppCompatActivity() {
    
    private lateinit var recyclerView: RecyclerView
    private lateinit var familyAdapter: FamilyMemberAdapter
    private lateinit var addMemberButton: Button
    private lateinit var qrCodeButton: Button
    private lateinit var transactionsButton: Button
    private lateinit var settingsButton: Button
    private lateinit var familyNameText: TextView
    private lateinit var balanceText: TextView
    
    private val familyMembers = mutableListOf<FamilyMember>()
    private var currentFamilyId: String? = null
    private val requestQueue by lazy { Volley.newRequestQueue(this) }
    
    data class FamilyMember(
        val memberId: String,
        val name: String,
        val email: String,
        val role: String,
        val status: String,
        val spendingLimit: Double?,
        val permissions: MemberPermissions
    )
    
    data class MemberPermissions(
        val canSendPayments: Boolean,
        val canReceivePayments: Boolean,
        val requiresApproval: Boolean,
        val maxTransactionAmount: Double
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_family_dashboard)
        
        initializeViews()
        setupRecyclerView()
        loadFamilyData()
        setupClickListeners()
    }
    
    private fun initializeViews() {
        recyclerView = findViewById(R.id.recyclerViewFamilyMembers)
        addMemberButton = findViewById(R.id.buttonAddMember)
        qrCodeButton = findViewById(R.id.buttonGenerateQR)
        transactionsButton = findViewById(R.id.buttonTransactions)
        settingsButton = findViewById(R.id.buttonSettings)
        familyNameText = findViewById(R.id.textFamilyName)
        balanceText = findViewById(R.id.textBalance)
    }
    
    private fun setupRecyclerView() {
        familyAdapter = FamilyMemberAdapter(familyMembers) { member ->
            showMemberOptions(member)
        }
        
        recyclerView.apply {
            layoutManager = LinearLayoutManager(this@FamilyDashboardActivity)
            adapter = familyAdapter
        }
    }
    
    private fun setupClickListeners() {
        addMemberButton.setOnClickListener {
            showAddMemberDialog()
        }
        
        qrCodeButton.setOnClickListener {
            startActivity(Intent(this, QRCodeGeneratorActivity::class.java))
        }
        
        transactionsButton.setOnClickListener {
            val intent = Intent(this, TransactionsActivity::class.java)
            intent.putExtra("familyId", currentFamilyId)
            startActivity(intent)
        }
        
        settingsButton.setOnClickListener {
            startActivity(Intent(this, FamilySettingsActivity::class.java))
        }
    }
    
    private fun loadFamilyData() {
        val userToken = getUserToken()
        val url = "${BuildConfig.API_BASE_URL}/api/family/current"
        
        val request = JsonObjectRequest(
            Request.Method.GET, url, null,
            { response ->
                parseFamilyData(response)
            },
            { error ->
                showError("Failed to load family data: ${error.message}")
            }
        )
        
        // Add auth header
        request.headers["Authorization"] = "Bearer $userToken"
        requestQueue.add(request)
    }
    
    private fun parseFamilyData(json: JSONObject) {
        try {
            val family = json.getJSONObject("family")
            currentFamilyId = family.getString("familyId")
            
            familyNameText.text = family.getString("parentEmail")
            balanceText.text = "$${family.getDouble("balance")}"
            
            val membersArray = family.getJSONArray("children")
            val members = mutableListOf<FamilyMember>()
            
            for (i in 0 until membersArray.length()) {
                val memberJson = membersArray.getJSONObject(i)
                val permissionsJson = memberJson.getJSONObject("permissions")
                
                val member = FamilyMember(
                    memberId = memberJson.getString("memberId"),
                    name = memberJson.getString("name"),
                    email = memberJson.getString("email"),
                    role = memberJson.getString("role"),
                    status = memberJson.getString("status"),
                    spendingLimit = if (memberJson.has("spendingLimit")) 
                        memberJson.getDouble("spendingLimit") else null,
                    permissions = MemberPermissions(
                        canSendPayments = permissionsJson.getBoolean("canSendPayments"),
                        canReceivePayments = permissionsJson.getBoolean("canReceivePayments"),
                        requiresApproval = permissionsJson.getBoolean("requiresApproval"),
                        maxTransactionAmount = permissionsJson.getDouble("maxTransactionAmount")
                    )
                )
                members.add(member)
            }
            
            familyMembers.clear()
            familyMembers.addAll(members)
            familyAdapter.notifyDataSetChanged()
            
        } catch (e: Exception) {
            showError("Error parsing family data: ${e.message}")
        }
    }
    
    private fun showMemberOptions(member: FamilyMember) {
        val options = arrayOf("Send Money", "Request Money", "View Profile", "Edit Permissions")
        
        AlertDialog.Builder(this)
            .setTitle("${member.name}")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showSendMoneyDialog(member)
                    1 -> showRequestMoneyDialog(member)
                    2 -> showMemberProfile(member)
                    3 -> showEditPermissionsDialog(member)
                }
            }
            .show()
    }
    
    private fun showSendMoneyDialog(member: FamilyMember) {
        val builder = AlertDialog.Builder(this)
        val inflater = layoutInflater
        val dialogView = inflater.inflate(R.layout.dialog_send_money, null)
        
        val amountInput = dialogView.findViewById<EditText>(R.id.editAmount)
        val noteInput = dialogView.findViewById<EditText>(R.id.editNote)
        
        builder.setView(dialogView)
            .setTitle("Send Money to ${member.name}")
            .setPositiveButton("Send") { _, _ ->
                val amount = amountInput.text.toString().toDoubleOrNull()
                val note = noteInput.text.toString()
                
                if (amount != null && amount > 0) {
                    sendMoney(member, amount, note)
                } else {
                    Toast.makeText(this, "Please enter a valid amount", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun sendMoney(member: FamilyMember, amount: Double, note: String) {
        val userToken = getUserToken()
        val url = "${BuildConfig.API_BASE_URL}/api/payments/send"
        
        val paymentData = JSONObject().apply {
            put("familyId", currentFamilyId)
            put("fromMemberId", getCurrentMemberId())
            put("toMemberId", member.memberId)
            put("amount", amount)
            put("note", note)
        }
        
        val request = JsonObjectRequest(
            Request.Method.POST, url, paymentData,
            { response ->
                if (response.getBoolean("success")) {
                    Toast.makeText(this, "Money sent successfully!", Toast.LENGTH_SHORT).show()
                    loadTransactions() // Refresh transaction list
                } else {
                    showError("Payment failed: ${response.getString("error")}")
                }
            },
            { error ->
                showError("Payment failed: ${error.message}")
            }
        )
        
        request.headers["Authorization"] = "Bearer $userToken"
        requestQueue.add(request)
    }
    
    private fun showRequestMoneyDialog(member: FamilyMember) {
        val builder = AlertDialog.Builder(this)
        val inflater = layoutInflater
        val dialogView = inflater.inflate(R.layout.dialog_request_money, null)
        
        val amountInput = dialogView.findViewById<EditText>(R.id.editAmount)
        val noteInput = dialogView.findViewById<EditText>(R.id.editNote)
        
        builder.setView(dialogView)
            .setTitle("Request Money from ${member.name}")
            .setPositiveButton("Request") { _, _ ->
                val amount = amountInput.text.toString().toDoubleOrNull()
                val note = noteInput.text.toString()
                
                if (amount != null && amount > 0) {
                    requestMoney(member, amount, note)
                } else {
                    Toast.makeText(this, "Please enter a valid amount", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun requestMoney(member: FamilyMember, amount: Double, note: String) {
        // Implementation for requesting money
        Toast.makeText(this, "Money request sent to ${member.name}", Toast.LENGTH_SHORT).show()
    }
    
    private fun showMemberProfile(member: FamilyMember) {
        val intent = Intent(this, MemberProfileActivity::class.java)
        intent.putExtra("memberId", member.memberId)
        intent.putExtra("familyId", currentFamilyId)
        startActivity(intent)
    }
    
    private fun showEditPermissionsDialog(member: FamilyMember) {
        if (member.role != "parent") {
            Toast.makeText(this, "Only parents can edit permissions", Toast.LENGTH_SHORT).show()
            return
        }
        
        val intent = Intent(this, EditPermissionsActivity::class.java)
        intent.putExtra("memberId", member.memberId)
        intent.putExtra("familyId", currentFamilyId)
        startActivity(intent)
    }
    
    private fun showAddMemberDialog() {
        val builder = AlertDialog.Builder(this)
        val inflater = layoutInflater
        val dialogView = inflater.inflate(R.layout.dialog_add_member, null)
        
        val nameInput = dialogView.findViewById<EditText>(R.id.editName)
        val emailInput = dialogView.findViewById<EditText>(R.id.editEmail)
        val roleSpinner = dialogView.findViewById<Spinner>(R.id.spinnerRole)
        
        // Setup role spinner
        val roles = arrayOf("Child", "Parent")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        roleSpinner.adapter = adapter
        
        builder.setView(dialogView)
            .setTitle("Add Family Member")
            .setPositiveButton("Add") { _, _ ->
                val name = nameInput.text.toString()
                val email = emailInput.text.toString()
                val role = roleSpinner.selectedItem.toString().lowercase()
                
                if (name.isNotEmpty() && email.isNotEmpty()) {
                    addFamilyMember(name, email, role)
                } else {
                    Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun addFamilyMember(name: String, email: String, role: String) {
        val userToken = getUserToken()
        val url = "${BuildConfig.API_BASE_URL}/api/family/${currentFamilyId}/add-member"
        
        val memberData = JSONObject().apply {
            put("name", name)
            put("email", email)
            put("role", role)
        }
        
        val request = JsonObjectRequest(
            Request.Method.POST, url, memberData,
            { response ->
                if (response.getBoolean("success")) {
                    Toast.makeText(this, "Member added successfully!", Toast.LENGTH_SHORT).show()
                    loadFamilyData() // Refresh family data
                } else {
                    showError("Failed to add member: ${response.getString("error")}")
                }
            },
            { error ->
                showError("Failed to add member: ${error.message}")
            }
        )
        
        request.headers["Authorization"] = "Bearer $userToken"
        requestQueue.add(request)
    }
    
    private fun loadTransactions() {
        // Load recent transactions to update balance
        if (currentFamilyId != null) {
            val intent = Intent(this, TransactionsActivity::class.java)
            intent.putExtra("familyId", currentFamilyId)
            startActivity(intent)
        }
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
    
    private fun getUserToken(): String {
        val prefs = getSharedPreferences("VenmoFamily", MODE_PRIVATE)
        return prefs.getString("userToken", "") ?: ""
    }
    
    private fun getCurrentMemberId(): String {
        val prefs = getSharedPreferences("VenmoFamily", MODE_PRIVATE)
        return prefs.getString("memberId", "") ?: ""
    }
    
    /**
     * 📱 Family Member Adapter
     */
    inner class FamilyMemberAdapter(
        private val members: List<FamilyMember>,
        private val onMemberClick: (FamilyMember) -> Unit
    ) : RecyclerView.Adapter<FamilyMemberAdapter.ViewHolder>() {
        
        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val nameText: TextView = view.findViewById(R.id.textMemberName)
            val emailText: TextView = view.findViewById(R.id.textMemberEmail)
            val roleText: TextView = view.findViewById(R.id.textMemberRole)
            val statusText: TextView = view.findViewById(R.id.textMemberStatus)
            val limitText: TextView = view.findViewById(R.id.textSpendingLimit)
            val roleBadge: View = view.findViewById(R.id.viewRoleBadge)
        }
        
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_family_member, parent, false)
            return ViewHolder(view)
        }
        
        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val member = members[position]
            
            holder.nameText.text = member.name
            holder.emailText.text = member.email
            holder.roleText.text = member.role.replaceFirstChar { it.uppercase() }
            
            // Status
            holder.statusText.text = member.status.replaceFirstChar { it.uppercase() }
            holder.statusText.setTextColor(
                when (member.status) {
                    "active" -> getColor(R.color.success)
                    "pending" -> getColor(R.color.warning)
                    "suspended" -> getColor(R.color.error)
                    else -> getColor(R.color.text_secondary)
                }
            )
            
            // Spending limit
            if (member.spendingLimit != null) {
                holder.limitText.text = "Limit: $${member.spendingLimit}"
                holder.limitText.visibility = View.VISIBLE
            } else {
                holder.limitText.visibility = View.GONE
            }
            
            // Role badge
            holder.roleBadge.setBackgroundColor(
                when (member.role) {
                    "parent" -> getColor(R.color.parent_badge)
                    "child" -> getColor(R.color.child_badge)
                    else -> getColor(R.color.default_badge)
                }
            )
            
            holder.itemView.setOnClickListener {
                onMemberClick(member)
            }
        }
        
        override fun getItemCount(): Int = members.size
    }
}
