#!/usr/bin/env swift
//
//  BunStatusWidgetLegacy.swift
//  Bun TOML Secrets Editor Status Widget
//  Legacy macOS Status Bar Widget (macOS 10.15+ compatible)
//
//  Usage: swift BunStatusWidgetLegacy.swift
//

import Cocoa
import Foundation

// MARK: - Status Data Models
struct WidgetStatus: Codable {
    let api: String
    let bucket: String
    let profiles: Int
    let lastUpdate: String
}

// MARK: - Status Monitor
class StatusMonitor {
    private let apiURL = URL(string: "http://localhost:3001/health")!
    private let bucketURL = URL(string: "https://pub-a471e86af24446498311933a2eca2454.r2.dev/profiles/README.md")!
    private let profilesPath = FileManager.default.currentDirectoryPath + "/profiles"
    
    private var status = WidgetStatus(api: "offline", bucket: "disconnected", profiles: 0, lastUpdate: "")
    private var timer: Timer?
    
    var onStatusUpdate: ((WidgetStatus) -> Void)?
    
    func startMonitoring() {
        updateStatus()
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { _ in
            self.updateStatus()
        }
    }
    
    func stopMonitoring() {
        timer?.invalidate()
        timer = nil
    }
    
    private func updateStatus() {
        let group = DispatchGroup()
        var apiStatus = "offline"
        var bucketStatus = "disconnected"
        var profileCount = 0
        
        // Check API status
        group.enter()
        let apiTask = URLSession.shared.dataTask(with: apiURL) { _, response, error in
            if let error = error {
                print("API Error: \(error.localizedDescription)")
                apiStatus = "error"
            } else if let httpResponse = response as? HTTPURLResponse {
                apiStatus = httpResponse.statusCode == 200 ? "online" : "error"
            }
            group.leave()
        }
        apiTask.resume()
        
        // Check bucket status
        group.enter()
        let bucketTask = URLSession.shared.dataTask(with: bucketURL) { _, response, error in
            if let error = error {
                print("Bucket Error: \(error.localizedDescription)")
                bucketStatus = "disconnected"
            } else if let httpResponse = response as? HTTPURLResponse {
                bucketStatus = httpResponse.statusCode == 200 ? "connected" : "error"
            }
            group.leave()
        }
        bucketTask.resume()
        
        // Count profiles
        group.enter()
        DispatchQueue.global().async {
            do {
                let files = try FileManager.default.contentsOfDirectory(atPath: self.profilesPath)
                profileCount = files.count
            } catch {
                profileCount = 0
            }
            group.leave()
        }
        
        group.notify(queue: .main) {
            self.status = WidgetStatus(
                api: apiStatus,
                bucket: bucketStatus,
                profiles: profileCount,
                lastUpdate: Date().timeIntervalSince1970.description
            )
            self.onStatusUpdate?(self.status)
        }
    }
}

// MARK: - Status Bar Application
class StatusBarController: NSObject, NSApplicationDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    private let statusMonitor = StatusMonitor()
    private let popover = NSPopover()
    private var eventMonitor: EventMonitor?
    
    override init() {
        super.init()
        
        // Setup status item with legacy icon
        if let button = statusItem.button {
            button.image = NSImage(named: NSImage.Name("NSActionTemplate")) // Legacy icon
            button.imageScaling = .scaleProportionallyDown
            button.action = #selector(togglePopover(_:))
        }
        
        // Setup popover
        popover.contentViewController = StatusPopoverViewController()
        popover.behavior = .transient
        
        // Setup event monitor for clicks outside
        eventMonitor = EventMonitor(mask: [.leftMouseDown, .rightMouseDown]) { [weak self] event in
            if let strongSelf = self, strongSelf.popover.isShown {
                strongSelf.closePopover(event)
            }
        }
        
        // Setup status monitoring
        statusMonitor.onStatusUpdate = { [weak self] status in
            DispatchQueue.main.async {
                self?.updateStatusItem(status)
            }
        }
        
        statusMonitor.startMonitoring()
    }
    
    @objc func togglePopover(_ sender: Any?) {
        if popover.isShown {
            closePopover(sender)
        } else {
            showPopover(sender)
        }
    }
    
    func showPopover(_ sender: Any?) {
        if let button = statusItem.button {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: NSRectEdge.minY)
        }
        eventMonitor?.start()
    }
    
    func closePopover(_ sender: Any?) {
        popover.performClose(sender)
        eventMonitor?.stop()
    }
    
    private func updateStatusItem(_ status: WidgetStatus) {
        guard let button = statusItem.button else { return }
        
        // Update tooltip with legacy date formatting
        let date = Date(timeIntervalSince1970: Double(status.lastUpdate) ?? 0)
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        let dateString = formatter.string(from: date)
        
        let tooltip = """
        Bun TOML Secrets Editor
        API: \(status.api.capitalized)
        R2: \(status.bucket.capitalized)
        Profiles: \(status.profiles)
        Last Update: \(dateString)
        """
        button.toolTip = tooltip
        
        // Update icon color based on status
        let iconColor = status.api == "online" && status.bucket == "connected" ? NSColor.systemGreen : NSColor.systemRed
        button.image = createStatusIcon(color: iconColor)
    }
    
    private func createStatusIcon(color: NSColor) -> NSImage {
        let image = NSImage(named: NSImage.Name("NSActionTemplate")) ?? NSImage(size: NSSize(width: 16, height: 16))
        image.isTemplate = true
        
        let coloredImage = NSImage(size: image.size)
        coloredImage.lockFocus()
        
        color.set()
        image.draw(at: NSPoint.zero, from: NSRect.zero, operation: .sourceAtop, fraction: 1.0)
        
        coloredImage.unlockFocus()
        return coloredImage
    }
}

// MARK: - Popover View Controller
class StatusPopoverViewController: NSViewController {
    private let statusMonitor = StatusMonitor()
    private var statusLabel: NSTextField!
    private var apiLabel: NSTextField!
    private var bucketLabel: NSTextField!
    private var profilesLabel: NSTextField!
    private var lastUpdateLabel: NSTextField!
    
    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 300, height: 200))
        setupUI()
    }
    
    private func setupUI() {
        // Title
        let titleLabel = NSTextField(labelWithString: "Bun TOML Secrets Editor")
        titleLabel.font = NSFont.boldSystemFont(ofSize: 14)
        titleLabel.frame = NSRect(x: 20, y: 170, width: 260, height: 20)
        view.addSubview(titleLabel)
        
        // Status indicators
        statusLabel = NSTextField(labelWithString: "Status: Checking...")
        statusLabel.font = NSFont.systemFont(ofSize: 12)
        statusLabel.frame = NSRect(x: 20, y: 140, width: 260, height: 20)
        view.addSubview(statusLabel)
        
        apiLabel = NSTextField(labelWithString: "API: Offline")
        apiLabel.font = NSFont.systemFont(ofSize: 12)
        apiLabel.frame = NSRect(x: 20, y: 110, width: 260, height: 20)
        view.addSubview(apiLabel)
        
        bucketLabel = NSTextField(labelWithString: "R2 Bucket: Disconnected")
        bucketLabel.font = NSFont.systemFont(ofSize: 12)
        bucketLabel.frame = NSRect(x: 20, y: 80, width: 260, height: 20)
        view.addSubview(bucketLabel)
        
        profilesLabel = NSTextField(labelWithString: "Profiles: 0 files")
        profilesLabel.font = NSFont.systemFont(ofSize: 12)
        profilesLabel.frame = NSRect(x: 20, y: 50, width: 260, height: 20)
        view.addSubview(profilesLabel)
        
        lastUpdateLabel = NSTextField(labelWithString: "Last Update: Never")
        lastUpdateLabel.font = NSFont.systemFont(ofSize: 11)
        lastUpdateLabel.textColor = NSColor.secondaryLabelColor
        lastUpdateLabel.frame = NSRect(x: 20, y: 20, width: 260, height: 20)
        view.addSubview(lastUpdateLabel)
        
        // Setup monitoring
        statusMonitor.onStatusUpdate = { [weak self] status in
            DispatchQueue.main.async {
                self?.updateUI(status)
            }
        }
        
        statusMonitor.startMonitoring()
    }
    
    private func updateUI(_ status: WidgetStatus) {
        // Update status text
        let overallStatus = (status.api == "online" && status.bucket == "connected") ? "🟢 Online" : "🔴 Offline"
        statusLabel.stringValue = "Status: \(overallStatus)"
        
        // Update individual components
        let apiText = status.api == "online" ? "🟢 API: Online" : "🔴 API: Offline"
        apiLabel.stringValue = apiText
        
        let bucketText = status.bucket == "connected" ? "🟢 R2: Connected" : "🔴 R2: Disconnected"
        bucketLabel.stringValue = bucketText
        
        profilesLabel.stringValue = "📁 Profiles: \(status.profiles) files"
        
        let date = Date(timeIntervalSince1970: Double(status.lastUpdate) ?? 0)
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        let dateString = formatter.string(from: date)
        
        lastUpdateLabel.stringValue = "🕐 Last Update: \(dateString)"
    }
}

// MARK: - Event Monitor
class EventMonitor {
    private var monitor: Any?
    private let mask: NSEvent.EventTypeMask
    private let handler: (NSEvent?) -> Void
    
    public init(mask: NSEvent.EventTypeMask, handler: @escaping (NSEvent?) -> Void) {
        self.mask = mask
        self.handler = handler
    }
    
    deinit {
        stop()
    }
    
    public func start() {
        monitor = NSEvent.addGlobalMonitorForEvents(matching: mask, handler: handler)
    }
    
    public func stop() {
        if monitor != nil {
            NSEvent.removeMonitor(monitor!)
            monitor = nil
        }
    }
}

// MARK: - Application Entry Point
let app = NSApplication.shared
let delegate = StatusBarController()
app.delegate = delegate

// Hide dock icon
app.setActivationPolicy(.accessory)

app.run()