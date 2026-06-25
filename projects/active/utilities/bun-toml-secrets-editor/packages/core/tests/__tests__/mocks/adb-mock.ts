export interface MockDevice {
	serial?: string;
	status: string;
	product?: string;
	model?: string;
	device?: string;
	transport_id?: number;
	isRooted?: boolean;
	isEmulator?: boolean;
	manufacturer?: string;
	brand?: string;
	androidVersion?: string;
	androidVersionCode?: number;
	language?: string;
	timezone?: string;
	mcc?: string;
	mnc?: string;
	networkType?: string;
	bluetoothName?: string;
	bluetoothMAC?: string;
	latitude?: number;
	longitude?: number;
	ip?: string;
	region?: string;
	state?: string;
	city?: string;
	zipCode?: string;
	wifiName?: string;
	simStatus?: string;
	phoneNumber?: string;
	imsi?: string;
	numeric?: string;
	operatorName?: string;
	iccid?: string;
	lac?: string;
	cid?: string;
	duoplusDevice?: boolean;
	connectionType?: string;
	buildFingerprint?: string;
	selinuxStatus?: string;
	power_state?: "on" | "off"; // Power state of device
}

export class ADBMock {
	private deviceMap = new Map<string, MockDevice>();
	private commandHistory: string[] = [];
	private duoplusEndpoint = "https://api.duoplus.net";
	private installedPackages = new Set<string>(); // Track installed packages

	constructor() {
		this.addRealDevice("DUOPLUS-OPPO-FIND-X7", {
			status: "device",
			power_state: "on",
			product: "oppo_find_x7",
			model: "Oppo FIND X7",
			device: "find_x7",
			transport_id: 1,
			manufacturer: "oppo",
			brand: "oppo",
			androidVersion: "15",
			androidVersionCode: 35,
			language: "en-US",
			timezone: "America/New_York",
			mcc: "310",
			mnc: "260",
			networkType: "LTE",
			bluetoothName: "PHZ110",
			bluetoothMAC: "7e:98:8c:d7:21:02",
			latitude: 38.997311,
			longitude: -76.931419,
			ip: "101.36.98.74",
			region: "us",
			state: "virginia",
			city: "reston",
			zipCode: "22090",
			wifiName: "Haley Goldner",
			simStatus: "Open",
			phoneNumber: "+19837106512",
			imsi: "310260766056140",
			numeric: "310260",
			operatorName: "Verizon Wireless",
			iccid: "8912606408596249145",
			lac: "46193",
			cid: "59691765",
			duoplusDevice: true,
			connectionType: "cloud",
		});
	}

	addRealDevice(serial: string, properties: MockDevice): void {
		this.deviceMap.set(serial, { ...properties, serial, status: "device" });
	}

	addMockDevice(serial: string, properties: MockDevice): void {
		this.deviceMap.set(serial, { ...properties, serial, status: "device" });
	}

	async listDevices(): Promise<string> {
		const deviceList = Array.from(this.deviceMap.values())
			.map((d) => `${d.serial}\t${d.status}`)
			.join("\n");
		this.commandHistory.push("devices");
		return deviceList;
	}

	async shell(serial: string, command: string): Promise<string> {
		this.commandHistory.push(`shell: ${command}`);
		const device = this.deviceMap.get(serial);

		if (command.includes("getprop")) {
			if (command.includes("ro.build.version.sdk"))
				return device?.androidVersion || "33";
			if (command.includes("ro.build.version.release"))
				return device?.androidVersion || "15";
			if (command.includes("ro.product.manufacturer"))
				return device?.manufacturer || "oppo";
			if (command.includes("ro.product.brand")) return device?.brand || "oppo";
			if (command.includes("ro.product.model"))
				return device?.model || "Oppo FIND X7";
			if (command.includes("ro.product.device"))
				return device?.device || "find_x7";
			if (command.includes("ro.build.fingerprint")) {
				return `${device?.brand}/${device?.product}/${device?.device}:${device?.androidVersion}/TP1A.220624.002/8768475:user/release-keys`;
			}
			if (command.includes("persist.sys.timezone"))
				return device?.timezone || "America/New_York";
			if (command.includes("ro.product.locale"))
				return device?.language || "en-US";
			if (command.includes("ro.cdma.operator.numeric"))
				return device?.mnc ? `${device.mcc}${device.mnc}` : "310260";
		}

		if (command.includes("pm list packages")) {
			// Simulate installed packages
			const basePackages = [
				"package:com.android.settings",
				"package:com.android.systemui",
				"package:com.google.android.gms",
				"package:com.google.android.youtube",
				"package:com.instagram.android",
				"package:com.facebook.katana",
				"package:com.tiktok",
				"package:com.zhiliaoapp.musically",
			];

			// Add dynamically installed packages
			const dynamicPackages = Array.from(this.installedPackages).map(
				(pkg) => `package:${pkg}`,
			);
			const allPackages = [...basePackages, ...dynamicPackages];

			if (command.includes("grep")) {
				// Filter packages based on grep
				const searchTerm = command.split("grep ")[1]?.trim() || "";
				const filteredPackages = allPackages.filter((pkg) =>
					pkg.includes(searchTerm),
				);
				return filteredPackages.join("\n");
			}

			return allPackages.join("\n");
		}

		if (command.includes("pm install")) {
			// Extract package name from install command and add to installed packages
			const packageName =
				command.match(/package:([^\s]+)/)?.[1] ||
				command.match(/install\s+.*?([^\s]+\.apk)/)?.[1] ||
				"com.example.newapp";

			// Add to installed packages
			this.installedPackages.add(packageName.replace(".apk", ""));

			return "Success\nPackage installed successfully";
		}

		if (command.includes("getenforce")) return "Enforcing";
		if (command.includes("su")) return "";
		return "";
	}

	async execOut(_serial: string, command: string): Promise<string> {
		this.commandHistory.push(`exec-out: ${command}`);
		if (command.includes("screencap")) {
			return Buffer.from([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
			]).toString("base64");
		}
		return "";
	}

	async pull(_serial: string, remotePath: string): Promise<Buffer> {
		this.commandHistory.push(`pull: ${remotePath}`);
		return Buffer.from([0x89, 0x50, 0x4e, 0x47]);
	}

	async push(
		_serial: string,
		localPath: string,
		remotePath: string,
	): Promise<void> {
		this.commandHistory.push(`push: ${localPath} -> ${remotePath}`);
	}

	async install(_serial: string, apkPath: string): Promise<string> {
		this.commandHistory.push(`install: ${apkPath}`);
		return "Success";
	}

	async featureSet(serial: string): Promise<string> {
		this.commandHistory.push(`feature-set: ${serial}`);
		return "feature_set:\n     cmd: 2\n     stat: 2\n     shell_v2: 2";
	}

	getCommandHistory(): string[] {
		return this.commandHistory;
	}

	clearHistory(): void {
		this.commandHistory = [];
	}

	configureRealDevice(endpoint: string, apiKey: string): void {
		this.duoplusEndpoint = endpoint;
		this.apiKey = apiKey;
		this.realDeviceConnection = true;
		this.commandHistory.push(`configured: ${endpoint}`);
	}

	// Enhanced cloud phone list method (POST /api/v1/cloudPhone/list)
	async getCloudPhoneList(params?: {
		page?: number;
		pagesize?: number;
		link_status?: string[];
		tag_ids?: string[];
		group_id?: string;
		share_status?: string[];
		region_id?: string[];
		adb_status?: string[];
		sort_by?: string;
		order?: string;
		image_id?: string[];
		ips?: string[];
		name?: string;
		start_phone_type?: string[];
		renewal_status?: string[];
		remark?: string;
		user_ids?: string[];
		proxy_id?: string;
	}): Promise<{
		code: number;
		data: {
			list: Array<{
				id: string;
				name: string;
				status: number; // 0 Not configured; 1 Powered on; 2 Powered off; 3 Expired; 4 Renewal overdue; 10 Powering on; 11 Configuring; 12 Configuration failed
				os: string;
				size: string;
				created_at: string;
				expired_at: string;
				ip: string;
				area: string;
				remark: string;
				adb: string;
				adb_password: string;
			}>;
			page: number;
			pagesize: number;
			total: number;
			total_page: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/list");

		// Validate pagesize (max 100 per API spec)
		const pagesize = Math.min(params?.pagesize || 10, 100);

		// Simulate real API response structure
		const mockDevices = Array.from(this.deviceMap.values()).map((device) => ({
			id: device.serial || "DUOPLUS-OPPO-FIND-X7",
			name: device.model || "Oppo FIND X7",
			status: 1, // Powered on
			os: `Android ${device.androidVersion || "15"}`,
			size: "30.08G",
			created_at: "2024-04-10 19:14:56",
			expired_at: "2024-06-10 19:14:56",
			ip: device.ip || "101.36.98.74",
			area:
				`${device.city}, ${device.state}`.replace("undefined", "").trim() ||
				"Reston, Virginia",
			remark: device.connectionType || "cloud",
			adb: "127.0.0.1:20100",
			adb_password: "",
		}));

		// Apply filters based on params
		let filteredDevices = mockDevices;

		if (params?.adb_status?.includes("1")) {
			filteredDevices = filteredDevices.filter((d) => d.status === 1);
		}

		if (params?.name) {
			filteredDevices = filteredDevices.filter((d) =>
				d.name.toLowerCase().includes(params.name?.toLowerCase()),
			);
		}

		if (params?.ips?.length) {
			filteredDevices = filteredDevices.filter((d) =>
				params.ips?.some((ip) => d.ip.includes(ip)),
			);
		}

		// Apply pagination
		const page = params?.page || 1;
		const startIndex = (page - 1) * pagesize;
		const endIndex = startIndex + pagesize;
		const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

		return {
			code: 200,
			data: {
				list: paginatedDevices,
				page: page,
				pagesize: pagesize,
				total: filteredDevices.length,
				total_page: Math.ceil(filteredDevices.length / pagesize),
			},
			message: "Success",
		};
	}

	// Cloud phone status method (POST /api/v1/cloudPhone/status)
	async getCloudPhoneStatus(image_ids: string[]): Promise<{
		code: number;
		data: {
			list: Array<{
				id: string;
				name: string;
				status: number; // 0 - Not configured; 1 - Powered on; 2 - Powered off; 3 - Expired; 4 - Renewal needed; 10 - Powering on; 11 - Configuring; 12 - Configuration failed
			}>;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/status");

		// Get devices matching the requested image_ids
		const statusList = image_ids.map((imageId) => {
			const device = this.deviceMap.get(imageId);
			return {
				id: imageId,
				name: device?.model || "Unknown Device",
				status: device ? 1 : 0, // 1 = Powered on, 0 = Not configured/not found
			};
		});

		return {
			code: 200,
			data: {
				list: statusList,
			},
			message: "Success",
		};
	}

	// Device details method (POST /api/v1/cloudPhone/info)
	async getCloudPhoneDetails(image_id: string): Promise<{
		code: number;
		data: {
			id: string;
			name: string;
			remark: string;
			os: string;
			proxy: {
				id: string;
				dns: number;
				ip: string;
				country: string;
				region: string;
				city: string;
				zipcode: string;
			};
			gps: {
				longitude: number;
				latitude: number;
			};
			locale: {
				timezone: string;
				language: string;
			};
			sim: {
				status: number;
				country: string;
				msisdn: string;
				operator: string;
				msin: string;
				iccid: string;
				mcc: string;
				mnc: string;
			};
			bluetooth: {
				name: string;
				address: string;
			};
			wifi: {
				status: number;
				name: string;
				mac: string;
				bssid: string;
			};
			device: {
				manufacturer: string;
				brand: string;
				model: string;
				imei: number;
				serialno: string;
				android_id: string;
				gsf_id: string;
				gaid: string;
			};
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/info");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {} as any,
				message: "Device not found",
			};
		}

		// Return comprehensive device details following Duoplus API spec
		return {
			code: 200,
			data: {
				id: image_id,
				name: device.model || "Unknown Device",
				remark: device.connectionType || "cloud",
				os: `Android ${device.androidVersion || "15"}`,
				proxy: {
					id: `proxy_${image_id}`,
					dns: 1,
					ip: device.ip || "101.36.98.74",
					country: device.region || "us",
					region: device.state || "virginia",
					city: device.city || "reston",
					zipcode: device.zipCode || "22090",
				},
				gps: {
					longitude: device.longitude || -76.931419,
					latitude: device.latitude || 38.997311,
				},
				locale: {
					timezone: device.timezone || "America/New_York",
					language: device.language || "en-US",
				},
				sim: {
					status: parseInt(device.simStatus || "1", 10),
					country: device.numeric?.slice(0, 3) || "310",
					msisdn: device.phoneNumber || "+19837106512",
					operator: device.operatorName || "Verizon Wireless",
					msin: device.imsi?.slice(6) || "766056140",
					iccid: device.iccid || "8912606408596249145",
					mcc: device.mcc || "310",
					mnc: device.mnc || "260",
				},
				bluetooth: {
					name: device.bluetoothName || "PHZ110",
					address: device.bluetoothMAC || "7e:98:8c:d7:21:02",
				},
				wifi: {
					status: 1,
					name: device.wifiName || "Haley Goldner",
					mac: "75:1C:2E:87:83:A3",
					bssid: "8f:2a:2d:1d:51:2c",
				},
				device: {
					manufacturer: device.manufacturer || "oppo",
					brand: device.brand || "oppo",
					model: device.model || "Oppo FIND X7",
					imei: 482564016639450,
					serialno: device.serial || "a10df8e3",
					android_id: "5b35b20428b0019b",
					gsf_id: "3836f06b8e2836d6",
					gaid: "99cd9730-7d13-41c8-bae0-8dde08311d0c",
				},
			},
			message: "Success",
		};
	}

	// Batch modify parameters method (POST /api/v1/cloudPhone/update)
	async batchModifyParameters(
		images: Array<{
			image_id: string;
			name?: string;
			remark?: string;
			proxy?: {
				id: string;
				dns: number;
			};
			gps?: {
				type: number; // 1 = simulate based on proxy IP, 2 = custom coordinates
				longitude?: number;
				latitude?: number;
			};
			locale?: {
				type: number; // 1 = simulate based on proxy IP, 2 = custom locale
				timezone?: string;
				language?: string;
			};
			sim?: {
				status: number;
				country: string;
				msisdn: string;
				operator: string;
				msin: string;
				iccid: string;
				mcc: string;
				mnc: string;
				imsi: string;
			};
			bluetooth?: {
				name: string;
				address: string;
			};
			wifi?: {
				status: number;
				name: string;
				mac: string;
				bssid: string;
			};
			device?: {
				imei: string;
				serialno: string;
				android_id: string;
				name: string;
				gsf_id: string;
				gaid: string;
			};
		}>,
	): Promise<{
		code: number;
		data: {
			success: string[]; // Successfully modified device IDs
			fail: string[]; // Failed device IDs
			fail_reason: { [image_id: string]: string }; // Failure reasons
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/update");

		const success: string[] = [];
		const fail: string[] = [];
		const fail_reason: { [image_id: string]: string } = {};

		// Process each device modification
		for (const image of images) {
			const device = this.deviceMap.get(image.image_id);

			if (!device) {
				fail.push(image.image_id);
				fail_reason[image.image_id] = "Device not found";
				continue;
			}

			try {
				// Update device properties based on provided parameters
				if (image.name) {
					device.model = image.name;
					device.brand = image.name.split(" ")[0]?.toLowerCase() || "unknown";
				}

				if (image.remark) {
					device.connectionType = image.remark;
				}

				if (image.proxy) {
					device.ip = image.proxy.id; // Use proxy ID as IP for simulation

					// If GPS type is 1, simulate based on proxy IP
					if (image.gps && image.gps.type === 1) {
						// Simulate GPS coordinates based on proxy IP
						// This is a simplified simulation - in reality would use geoIP lookup
						const proxyIP = image.proxy.id;
						if (
							proxyIP.includes("192.168.") ||
							proxyIP.includes("10.") ||
							proxyIP.includes("172.")
						) {
							// Private IP - use default location
							device.longitude = -76.931419;
							device.latitude = 38.997311;
						} else if (proxyIP.includes("103.")) {
							// Singapore IP range
							device.longitude = 103.775322;
							device.latitude = 1.342415;
						} else {
							// Default to US location
							device.longitude = -77.0365;
							device.latitude = 38.8977;
						}
					}

					// If locale type is 1, simulate based on proxy IP
					if (image.locale && image.locale.type === 1) {
						const proxyIP = image.proxy.id;
						if (
							proxyIP.includes("192.168.") ||
							proxyIP.includes("10.") ||
							proxyIP.includes("172.")
						) {
							device.timezone = "America/New_York";
							device.language = "en-US";
						} else if (proxyIP.includes("103.")) {
							device.timezone = "Asia/Singapore";
							device.language = "en-SG";
						} else {
							device.timezone = "America/New_York";
							device.language = "en-US";
						}
					}
				}

				if (image.gps && image.gps.type === 2) {
					device.longitude = image.gps.longitude;
					device.latitude = image.gps.latitude;
				}

				if (image.locale && image.locale.type === 2) {
					device.timezone = image.locale.timezone;
					device.language = image.locale.language;
				}

				if (image.sim) {
					device.phoneNumber = image.sim.msisdn;
					device.operatorName = image.sim.operator;
					device.imsi = image.sim.imsi;
					device.iccid = image.sim.iccid;
					device.mcc = image.sim.mcc;
					device.mnc = image.sim.mnc;
				}

				if (image.bluetooth) {
					device.bluetoothName = image.bluetooth.name;
					device.bluetoothMAC = image.bluetooth.address;
				}

				if (image.wifi) {
					device.wifiName = image.wifi.name;
				}

				if (image.device) {
					device.serial = image.device.serialno;
					device.manufacturer =
						image.device.name.split(" ")[0]?.toLowerCase() || "unknown";
					device.model = image.device.name;
				}

				// Update the device in the map
				this.deviceMap.set(image.image_id, device);
				success.push(image.image_id);
			} catch (error) {
				fail.push(image.image_id);
				fail_reason[image.image_id] =
					"Update failed: " +
					(error instanceof Error ? error.message : "Unknown error");
			}
		}

		return {
			code: 200,
			data: {
				success,
				fail,
				fail_reason,
			},
			message:
				fail.length === 0
					? "All devices updated successfully"
					: "Partial success",
		};
	}

	// Reset and regenerate device method (POST /api/v1/cloudPhone/newPhone)
	async resetAndRegenerateDevice(
		image_id: string,
		options?: {
			proxy_id?: string;
			phone_model?: string;
			gps?: {
				longitude: number;
				latitude: number;
			};
			locale?: {
				timezone: string;
				language: string;
			};
			sim?: {
				country: string;
				msisdn: string;
				operator: string;
				mcc: string;
				mnc: string;
			};
		},
	): Promise<{ code: number; data: { message: string }; message: string }> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/newPhone");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: { message: "Device not found" },
				message: "Device not found",
			};
		}

		// Check if device is powered on (requirement for this operation)
		if (device.status !== "device") {
			return {
				code: 400,
				data: { message: "Device must be powered on to reset" },
				message: "Device must be powered on to reset",
			};
		}

		try {
			// Reset device to factory defaults with new parameters
			const resetDevice: MockDevice = {
				...device, // Keep basic device info
				// Reset network identity
				ip: options?.proxy_id || device.ip,
				phoneNumber: options?.sim?.msisdn || this.generateRandomPhoneNumber(),
				operatorName: options?.sim?.operator || "Verizon Wireless",
				imsi: this.generateRandomIMSI(options?.sim?.mcc, options?.sim?.mnc),
				iccid: this.generateRandomICCID(),
				mcc: options?.sim?.mcc || "310",
				mnc: options?.sim?.mnc || "260",
				// Reset location
				longitude: options?.gps?.longitude || -76.931419,
				latitude: options?.gps?.latitude || 38.997311,
				city: "reston",
				state: "virginia",
				// Reset locale
				timezone: options?.locale?.timezone || "America/New_York",
				language: options?.locale?.language || "en-US",
				// Reset connectivity
				bluetoothName: "PHZ110",
				bluetoothMAC: this.generateRandomMAC(),
				wifiName: "Haley Goldner",
				// Reset device identity (new fingerprints)
				serial: this.generateRandomSerial(),
				androidVersion: "15",
				buildFingerprint: this.generateRandomBuildFingerprint(
					options?.phone_model || "oppo_find_x7",
				),
				connectionType: "cloud",
				// Reset security state
				isRooted: false,
				isEmulator: false,
				selinuxStatus: "Enforcing",
			};

			// Update device in the map
			this.deviceMap.set(image_id, resetDevice);

			return {
				code: 200,
				data: { message: "Success" },
				message: "Device reset and regenerated successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: { message: "Reset failed" },
				message:
					"Reset failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Helper methods for generating random device identities
	private generateRandomPhoneNumber(): string {
		const areaCode = Math.floor(Math.random() * 800) + 200; // 200-999
		const exchange = Math.floor(Math.random() * 800) + 200; // 200-999
		const number = Math.floor(Math.random() * 10000)
			.toString()
			.padStart(4, "0");
		return `+1${areaCode}${exchange}${number}`;
	}

	private generateRandomIMSI(mcc?: string, mnc?: string): string {
		const actualMCC = mcc || "310";
		const actualMNC = mnc || "260";
		const msin = Math.floor(Math.random() * 1000000000)
			.toString()
			.padStart(9, "0");
		return actualMCC + actualMNC + msin;
	}

	private generateRandomICCID(): string {
		const issuer = "89"; // Telecom industry identifier
		const country = Math.floor(Math.random() * 1000)
			.toString()
			.padStart(3, "0");
		const issuer2 = Math.floor(Math.random() * 100000)
			.toString()
			.padStart(5, "0");
		const individual = Math.floor(Math.random() * 10000000000)
			.toString()
			.padStart(10, "0");
		const checksum = Math.floor(Math.random() * 10);
		return `${issuer}${country}${issuer2}${individual}${checksum}`;
	}

	private generateRandomMAC(): string {
		const hexChars = "0123456789abcdef";
		let mac = "";
		for (let i = 0; i < 6; i++) {
			if (i > 0) mac += ":";
			mac += hexChars[Math.floor(Math.random() * 16)];
			mac += hexChars[Math.floor(Math.random() * 16)];
		}
		return mac;
	}

	private generateRandomSerial(): string {
		const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
		let serial = "";
		for (let i = 0; i < 8; i++) {
			serial += chars[Math.floor(Math.random() * chars.length)];
		}
		return serial;
	}

	private generateRandomBuildFingerprint(model: string): string {
		const brands = ["oppo", "samsung", "xiaomi", "huawei"];
		const brand = brands[Math.floor(Math.random() * brands.length)];
		const release = Math.floor(Math.random() * 5) + 10; // Android 10-14
		const buildId = Math.random().toString(36).substring(2, 10);
		return `${brand}/${model}/${model}:${release}/R${release}.${buildId}:${Math.floor(Math.random() * 1000000)}`;
	}

	async batchPowerOn(deviceIds: string[]): Promise<{
		success: boolean;
		results: { deviceId: string; status: string }[];
		message: string;
	}> {
		this.commandHistory.push(`api: batch-power-on: ${deviceIds.join(",")}`);

		const results = deviceIds.map((deviceId) => ({
			deviceId,
			status: "powered_on",
		}));

		return {
			success: true,
			results,
			message: "Devices powered on successfully",
		};
	}

	async executeADBCommand(
		deviceId: string,
		command: string,
	): Promise<{
		code: number;
		data: {
			success: boolean;
			content: string;
			message: string;
		};
		message: string;
	}> {
		this.commandHistory.push(`api: execute-adb: ${deviceId}: ${command}`);

		const device = this.deviceMap.get(deviceId);

		if (!device) {
			return {
				code: 404,
				data: {
					success: false,
					content: "",
					message: "Device not found",
				},
				message: "Device not found",
			};
		}

		try {
			// Use existing shell method for command execution
			const output = await this.shell(deviceId, command);

			return {
				code: 200,
				data: {
					success: true,
					content: output,
					message: "",
				},
				message: "Success",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					success: false,
					content: "",
					message:
						error instanceof Error ? error.message : "Command execution failed",
				},
				message: "Command execution failed",
			};
		}
	}

	async batchExecuteADBCommands(
		image_ids: string[],
		command: string,
	): Promise<{
		code: number;
		data: {
			[image_id: string]: {
				success: boolean;
				content: string;
				message: string;
			};
		};
		message: string;
	}> {
		this.commandHistory.push(
			`api: POST /api/v1/cloudPhone/command: ${image_ids.join(",")}: ${command}`,
		);

		const results: {
			[image_id: string]: {
				success: boolean;
				content: string;
				message: string;
			};
		} = {};

		// Process each device (up to 20 as per API spec)
		const devicesToProcess = image_ids.slice(0, 20);

		for (const imageId of devicesToProcess) {
			const device = this.deviceMap.get(imageId);

			if (!device) {
				results[imageId] = {
					success: false,
					content: "",
					message: "Device not found",
				};
				continue;
			}

			try {
				// Execute command using existing shell method
				const output = await this.shell(imageId, command);

				results[imageId] = {
					success: true,
					content: output,
					message: "",
				};
			} catch (error) {
				results[imageId] = {
					success: false,
					content: "",
					message:
						error instanceof Error ? error.message : "Command execution failed",
				};
			}
		}

		return {
			code: 200,
			data: results,
			message: "Success",
		};
	}

	async batchEnableADB(image_ids: string[]): Promise<{
		code: number;
		data: {
			success: string[]; // Successfully enabled device IDs
			fail: string[]; // Failed device IDs
			fail_reason: { [image_id: string]: string }; // Failure reasons
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/openAdb");

		const success: string[] = [];
		const fail: string[] = [];
		const fail_reason: { [image_id: string]: string } = {};

		// Process each device for ADB enabling
		for (const imageId of image_ids) {
			const device = this.deviceMap.get(imageId);

			if (!device) {
				fail.push(imageId);
				fail_reason[imageId] = "Device not found";
				continue;
			}

			try {
				// Check if device is powered on (requirement for ADB)
				if (device.status !== "device") {
					fail.push(imageId);
					fail_reason[imageId] = "Device must be powered on to enable ADB";
					continue;
				}

				// Simulate ADB enabling process
				device.status = "device"; // Ensure device status
				this.deviceMap.set(imageId, device);

				success.push(imageId);
			} catch (error) {
				fail.push(imageId);
				fail_reason[imageId] =
					"ADB enable failed: " +
					(error instanceof Error ? error.message : "Unknown error");
			}
		}

		return {
			code: 200,
			data: {
				success,
				fail,
				fail_reason,
			},
			message: fail.length === 0 ? "Success" : "Partial success",
		};
	}

	// Batch power control (POST /api/v1/cloudPhone/power)
	async batchPowerControl(
		image_ids: string[],
		action: "on" | "off",
	): Promise<{
		code: number;
		data: {
			success: string[]; // Successfully powered device IDs
			fail: string[]; // Failed device IDs
			fail_reason: { [image_id: string]: string }; // Failure reasons
		};
		message: string;
	}> {
		this.commandHistory.push(`api: POST /api/v1/cloudPhone/power - ${action}`);

		const success: string[] = [];
		const fail: string[] = [];
		const fail_reason: { [image_id: string]: string } = {};

		// Process each device for power control
		for (const imageId of image_ids) {
			const device = this.deviceMap.get(imageId);

			if (!device) {
				fail.push(imageId);
				fail_reason[imageId] = "Device not found";
				continue;
			}

			try {
				if (action === "on") {
					// Power on device
					device.status = "device"; // Powered on status
					device.power_state = "on";
					this.deviceMap.set(imageId, device);
					success.push(imageId);
				} else if (action === "off") {
					// Power off device
					device.status = "offline"; // Powered off status
					device.power_state = "off";
					this.deviceMap.set(imageId, device);
					success.push(imageId);
				}
			} catch (error) {
				fail.push(imageId);
				fail_reason[imageId] =
					`Power ${action} failed: ` +
					(error instanceof Error ? error.message : "Unknown error");
			}
		}

		return {
			code: 200,
			data: {
				success,
				fail,
				fail_reason,
			},
			message: fail.length === 0 ? "Success" : "Partial success",
		};
	}

	// Batch screenshot capture (POST /api/v1/cloudPhone/screenshot)
	async batchScreenshot(image_ids: string[]): Promise<{
		code: number;
		data: {
			success: string[]; // Successfully captured device IDs
			fail: string[]; // Failed device IDs
			fail_reason: { [image_id: string]: string }; // Failure reasons
			screenshots: {
				[image_id: string]: {
					filename: string;
					path: string;
					size: number;
					timestamp: string;
					url?: string;
				};
			}; // Screenshot information
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/screenshot");

		const success: string[] = [];
		const fail: string[] = [];
		const fail_reason: { [image_id: string]: string } = {};
		const screenshots: {
			[image_id: string]: {
				filename: string;
				path: string;
				size: number;
				timestamp: string;
				url?: string;
			};
		} = {};

		// Process each device for screenshot capture
		for (const imageId of image_ids) {
			const device = this.deviceMap.get(imageId);

			if (!device) {
				fail.push(imageId);
				fail_reason[imageId] = "Device not found";
				continue;
			}

			try {
				// Check if device is powered on (requirement for screenshot)
				if (device.status !== "device" || device.power_state !== "on") {
					fail.push(imageId);
					fail_reason[imageId] = "Device must be powered on to take screenshot";
					continue;
				}

				// Generate screenshot filename and path
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const filename = `screenshot_${imageId}_${timestamp}.png`;
				const path = `/sdcard/screenshots/${filename}`;

				// Simulate screenshot capture using ADB command
				const adbResult = await this.executeADBCommand(
					imageId,
					`screencap -p ${path}`,
				);

				if (adbResult.code === 200 && adbResult.data.success) {
					// Generate simulated screenshot info
					screenshots[imageId] = {
						filename,
						path,
						size: 1024 * 768 * 4, // Simulated PNG file size (1024x768 RGBA)
						timestamp: new Date().toISOString(),
						url: `https://api.duoplus.net/files/screenshots/${filename}`, // Simulated download URL
					};
					success.push(imageId);
				} else {
					fail.push(imageId);
					fail_reason[imageId] = "Screenshot capture failed";
				}
			} catch (error) {
				fail.push(imageId);
				fail_reason[imageId] =
					"Screenshot capture failed: " +
					(error instanceof Error ? error.message : "Unknown error");
			}
		}

		return {
			code: 200,
			data: {
				success,
				fail,
				fail_reason,
				screenshots,
			},
			message: fail.length === 0 ? "Success" : "Partial success",
		};
	}

	// Batch file upload (POST /api/v1/cloudPhone/upload)
	async batchUploadFile(
		image_ids: string[],
		file_data: {
			filename: string;
			content?: string;
			size?: number;
			destination_path?: string;
		},
	): Promise<{
		code: number;
		data: {
			success: string[]; // Successfully uploaded device IDs
			fail: string[]; // Failed device IDs
			fail_reason: { [image_id: string]: string }; // Failure reasons
			uploads: {
				[image_id: string]: {
					filename: string;
					path: string;
					size: number;
					timestamp: string;
					url?: string;
				};
			}; // Upload information
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/upload");

		const success: string[] = [];
		const fail: string[] = [];
		const fail_reason: { [image_id: string]: string } = {};
		const uploads: {
			[image_id: string]: {
				filename: string;
				path: string;
				size: number;
				timestamp: string;
				url?: string;
			};
		} = {};

		// Process each device for file upload
		for (const imageId of image_ids) {
			const device = this.deviceMap.get(imageId);

			if (!device) {
				fail.push(imageId);
				fail_reason[imageId] = "Device not found";
				continue;
			}

			try {
				// Check if device is powered on (requirement for file upload)
				if (device.status !== "device" || device.power_state !== "on") {
					fail.push(imageId);
					fail_reason[imageId] = "Device must be powered on to upload files";
					continue;
				}

				// Generate upload path
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const filename = file_data.filename || `upload_${timestamp}.txt`;
				const destinationPath =
					file_data.destination_path || `/sdcard/uploads/${filename}`;
				const fileSize = file_data.size || file_data.content?.length || 1024;

				// Create upload directory and upload file using ADB commands
				await this.executeADBCommand(imageId, `mkdir -p /sdcard/uploads`);

				// Simulate file upload (in real implementation, this would handle file transfer)
				const adbResult = await this.executeADBCommand(
					imageId,
					`echo "${file_data.content || "Sample file content"}" > ${destinationPath}`,
				);

				if (adbResult.code === 200 && adbResult.data.success) {
					// Generate upload info
					uploads[imageId] = {
						filename,
						path: destinationPath,
						size: fileSize,
						timestamp: new Date().toISOString(),
						url: `https://api.duoplus.net/files/uploads/${filename}`, // Simulated download URL
					};
					success.push(imageId);
				} else {
					fail.push(imageId);
					fail_reason[imageId] = "File upload failed";
				}
			} catch (error) {
				fail.push(imageId);
				fail_reason[imageId] =
					"File upload failed: " +
					(error instanceof Error ? error.message : "Unknown error");
			}
		}

		return {
			code: 200,
			data: {
				success,
				fail,
				fail_reason,
				uploads,
			},
			message: fail.length === 0 ? "Success" : "Partial success",
		};
	}

	// Batch app installation (POST /api/v1/cloudPhone/install)
	async batchInstallApp(
		image_ids: string[],
		app_data: {
			package_name: string;
			apk_url?: string;
			apk_path?: string;
			install_flags?: string[];
		},
	): Promise<{
		code: number;
		data: {
			success: string[]; // Successfully installed device IDs
			fail: string[]; // Failed device IDs
			fail_reason: { [image_id: string]: string }; // Failure reasons
			installations: {
				[image_id: string]: {
					package_name: string;
					version: string;
					install_time: string;
					status: "installed" | "failed" | "already_installed";
					path?: string;
				};
			}; // Installation information
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/install");

		const success: string[] = [];
		const fail: string[] = [];
		const fail_reason: { [image_id: string]: string } = {};
		const installations: {
			[image_id: string]: {
				package_name: string;
				version: string;
				install_time: string;
				status: "installed" | "failed" | "already_installed";
				path?: string;
			};
		} = {};

		// Process each device for app installation
		for (const imageId of image_ids) {
			const device = this.deviceMap.get(imageId);

			if (!device) {
				fail.push(imageId);
				fail_reason[imageId] = "Device not found";
				continue;
			}

			try {
				// Check if device is powered on (requirement for app installation)
				if (device.status !== "device" || device.power_state !== "on") {
					fail.push(imageId);
					fail_reason[imageId] = "Device must be powered on to install apps";
					continue;
				}

				const packageName = app_data.package_name;

				// Check if app is already installed
				const checkResult = await this.executeADBCommand(
					imageId,
					`pm list packages | grep ${packageName}`,
				);

				if (
					checkResult.code === 200 &&
					checkResult.data.success &&
					checkResult.data.content.includes(packageName)
				) {
					// App already installed
					installations[imageId] = {
						package_name: packageName,
						version: "1.0.0",
						install_time: new Date().toISOString(),
						status: "already_installed",
					};
					success.push(imageId);
					continue;
				}

				// Simulate app installation
				let installCommand: string;

				if (app_data.apk_url) {
					// Install from URL
					installCommand = `curl -L ${app_data.apk_url} -o /sdcard/temp.apk && pm install ${app_data.install_flags?.join(" ") || ""} /sdcard/temp.apk`;
				} else if (app_data.apk_path) {
					// Install from local path
					installCommand = `pm install ${app_data.install_flags?.join(" ") || ""} ${app_data.apk_path}`;
				} else {
					// Simulate installation for demo purposes
					installCommand = `echo "Installing ${packageName}..." && pm install ${app_data.install_flags?.join(" ") || ""} /sdcard/demo.apk`;
				}

				const adbResult = await this.executeADBCommand(imageId, installCommand);

				if (adbResult.code === 200 && adbResult.data.success) {
					// Manually add the package to installed packages for simulation
					this.installedPackages.add(packageName);

					// Verify installation
					const verifyResult = await this.executeADBCommand(
						imageId,
						`pm list packages | grep ${packageName}`,
					);

					if (
						verifyResult.code === 200 &&
						verifyResult.data.success &&
						verifyResult.data.content.includes(packageName)
					) {
						installations[imageId] = {
							package_name: packageName,
							version: "1.0.0",
							install_time: new Date().toISOString(),
							status: "installed",
							path: `/data/app/${packageName}/base.apk`,
						};
						success.push(imageId);
					} else {
						fail.push(imageId);
						fail_reason[imageId] = "App installation verification failed";
					}
				} else {
					fail.push(imageId);
					fail_reason[imageId] = "App installation failed";
				}
			} catch (error) {
				fail.push(imageId);
				fail_reason[imageId] =
					"App installation failed: " +
					(error instanceof Error ? error.message : "Unknown error");
			}
		}

		return {
			code: 200,
			data: {
				success,
				fail,
				fail_reason,
				installations,
			},
			message: fail.length === 0 ? "Success" : "Partial success",
		};
	}

	// Factory reset (POST /api/v1/cloudPhone/factory-reset)
	async factoryReset(
		image_id: string,
		options?: {
			proxy_id?: string;
			dns?: number;
			model?: string;
			gps?: {
				type: number;
				longitude?: string;
				latitude?: string;
			};
			locale?: {
				type: number;
				timezone?: string;
				language?: string;
			};
			sim?: {
				type: number;
				country?: string;
			};
			data_type?: number;
			dpi_name?: number;
			network_mode?: number;
			keep_gp?: number;
		},
	): Promise<{ code: number; data: { message: string }; message: string }> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/factory-reset");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: { message: "Device not found" },
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on (requirement for factory reset)
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						message: "Device must be powered on to perform factory reset",
					},
					message: "Device must be powered on to perform factory reset",
				};
			}

			// Simulate factory reset process
			const resetCommand = "recovery --wipe_data";
			const adbResult = await this.executeADBCommand(image_id, resetCommand);

			if (adbResult.code === 200 && adbResult.data.success) {
				// Clear installed packages (factory reset removes all apps)
				this.installedPackages.clear();

				// Reset device to initial state
				device.status = "device"; // Device stays online
				device.power_state = "on"; // Device stays powered on

				// Apply optional configurations
				if (options) {
					if (options.gps) {
						device.latitude = parseFloat(options.gps.latitude || "0");
						device.longitude = parseFloat(options.gps.longitude || "0");
					}
					if (options.locale) {
						device.timezone = options.locale.timezone || device.timezone;
						device.language = options.locale.language || device.language;
					}
					if (options.model) {
						device.model = options.model;
					}
				}

				this.deviceMap.set(image_id, device);

				return {
					code: 200,
					data: { message: "Success" },
					message: "Success",
				};
			} else {
				return {
					code: 500,
					data: { message: "Factory reset failed" },
					message: "Factory reset failed",
				};
			}
		} catch (error) {
			return {
				code: 500,
				data: {
					message:
						"Factory reset failed: " +
						(error instanceof Error ? error.message : "Unknown error"),
				},
				message: "Factory reset failed",
			};
		}
	}

	// App Management Methods

	// List apps (POST /api/v1/cloudPhone/apps/list)
	async listApps(
		image_id: string,
		options?: {
			type?: "all" | "system" | "user";
			filter?: string;
			limit?: number;
			offset?: number;
		},
	): Promise<{
		code: number;
		data: {
			apps: Array<{
				package_name: string;
				app_name: string;
				version: string;
				size: number;
				install_time: string;
				type: "system" | "user";
			}>;
			total: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/apps/list");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: { apps: [], total: 0 },
				message: "Device not found",
			};
		}

		try {
			// Get installed packages
			const adbResult = await this.executeADBCommand(
				image_id,
				"pm list packages",
			);

			if (adbResult.code === 200 && adbResult.data.success) {
				const packages = adbResult.data.content
					.split("\n")
					.filter((line) => line.startsWith("package:"))
					.map((line) => line.replace("package:", ""));

				// Convert to app objects
				const systemApps = [
					"com.android.settings",
					"com.android.systemui",
					"com.google.android.gms",
				];

				const apps = packages.map((pkg) => ({
					package_name: pkg,
					app_name: pkg.split(".").pop() || pkg,
					version: "1.0.0",
					size: Math.floor(Math.random() * 50000000) + 1000000, // 1MB - 50MB
					install_time: new Date().toISOString(),
					type: systemApps.includes(pkg)
						? ("system" as const)
						: ("user" as const),
				}));

				// Apply filters
				let filteredApps = apps;
				if (options?.type === "system") {
					filteredApps = apps.filter((app) => app.type === "system");
				} else if (options?.type === "user") {
					filteredApps = apps.filter((app) => app.type === "user");
				}

				if (options?.filter) {
					filteredApps = filteredApps.filter(
						(app) =>
							app.package_name.includes(options.filter!) ||
							app.app_name.includes(options.filter!),
					);
				}

				// Apply pagination
				const total = filteredApps.length;
				const offset = options?.offset || 0;
				const limit = options?.limit || 50;
				const paginatedApps = filteredApps.slice(offset, offset + limit);

				return {
					code: 200,
					data: {
						apps: paginatedApps,
						total,
					},
					message: "Success",
				};
			} else {
				return {
					code: 500,
					data: { apps: [], total: 0 },
					message: "Failed to list apps",
				};
			}
		} catch (error) {
			return {
				code: 500,
				data: { apps: [], total: 0 },
				message:
					"Failed to list apps: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Uninstall app (POST /api/v1/cloudPhone/apps/uninstall)
	async uninstallApp(
		image_id: string,
		package_name: string,
	): Promise<{
		code: number;
		data: {
			success: string[];
			fail: string[];
			fail_reason: { [image_id: string]: string };
			uninstallations: {
				[image_id: string]: {
					package_name: string;
					uninstall_time: string;
					status: "uninstalled" | "failed" | "not_found";
				};
			};
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/apps/uninstall");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					success: [],
					fail: [image_id],
					fail_reason: { [image_id]: "Device not found" },
					uninstallations: {},
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						success: [],
						fail: [image_id],
						fail_reason: {
							[image_id]: "Device must be powered on to uninstall apps",
						},
						uninstallations: {},
					},
					message: "Device must be powered on to uninstall apps",
				};
			}

			// Check if app is installed
			const checkResult = await this.executeADBCommand(
				image_id,
				`pm list packages | grep ${package_name}`,
			);

			if (
				checkResult.code === 200 &&
				checkResult.data.success &&
				checkResult.data.content.includes(package_name)
			) {
				// Uninstall the app
				const uninstallResult = await this.executeADBCommand(
					image_id,
					`pm uninstall ${package_name}`,
				);

				if (uninstallResult.code === 200 && uninstallResult.data.success) {
					// Remove from installed packages
					this.installedPackages.delete(package_name);

					return {
						code: 200,
						data: {
							success: [image_id],
							fail: [],
							fail_reason: {},
							uninstallations: {
								[image_id]: {
									package_name,
									uninstall_time: new Date().toISOString(),
									status: "uninstalled" as const,
								},
							},
						},
						message: "Success",
					};
				} else {
					return {
						code: 500,
						data: {
							success: [],
							fail: [image_id],
							fail_reason: { [image_id]: "App uninstallation failed" },
							uninstallations: {},
						},
						message: "App uninstallation failed",
					};
				}
			} else {
				return {
					code: 200,
					data: {
						success: [],
						fail: [image_id],
						fail_reason: { [image_id]: "App not found" },
						uninstallations: {
							[image_id]: {
								package_name,
								uninstall_time: new Date().toISOString(),
								status: "not_found" as const,
							},
						},
					},
					message: "App not found",
				};
			}
		} catch (error) {
			return {
				code: 500,
				data: {
					success: [],
					fail: [image_id],
					fail_reason: {
						[image_id]:
							"App uninstallation failed: " +
							(error instanceof Error ? error.message : "Unknown error"),
					},
					uninstallations: {},
				},
				message: "App uninstallation failed",
			};
		}
	}

	// Batch app operations (POST /api/v1/cloudPhone/apps/batch)
	async batchAppOperations(
		image_id: string,
		operations: Array<{
			type: "install" | "uninstall" | "update";
			package_name: string;
			parameters?: any;
		}>,
	): Promise<{
		code: number;
		data: {
			operations: Array<{
				type: string;
				package_name: string;
				status: "success" | "failed";
				message: string;
			}>;
			results: {
				successful: number;
				failed: number;
				total: number;
			};
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/apps/batch");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					operations: [],
					results: { successful: 0, failed: 0, total: 0 },
				},
				message: "Device not found",
			};
		}

		try {
			const results = [];
			let successful = 0;
			let failed = 0;

			for (const operation of operations) {
				try {
					let result;

					if (operation.type === "install") {
						result = await this.batchInstallApp([image_id], {
							package_name: operation.package_name,
							...operation.parameters,
						});
					} else if (operation.type === "uninstall") {
						result = await this.uninstallApp(image_id, operation.package_name);
					} else {
						result = {
							code: 400,
							data: {},
							message: "Unsupported operation type",
						};
					}

					if (result.code === 200) {
						results.push({
							type: operation.type,
							package_name: operation.package_name,
							status: "success" as const,
							message: result.message,
						});
						successful++;
					} else {
						results.push({
							type: operation.type,
							package_name: operation.package_name,
							status: "failed" as const,
							message: result.message,
						});
						failed++;
					}
				} catch (error) {
					results.push({
						type: operation.type,
						package_name: operation.package_name,
						status: "failed" as const,
						message:
							"Operation failed: " +
							(error instanceof Error ? error.message : "Unknown error"),
					});
					failed++;
				}
			}

			return {
				code: 200,
				data: {
					operations: results,
					results: {
						successful,
						failed,
						total: operations.length,
					},
				},
				message: failed === 0 ? "Success" : "Partial success",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					operations: [],
					results: { successful: 0, failed: 0, total: 0 },
				},
				message:
					"Batch operations failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// List preinstalled apps (POST /api/v1/cloudPhone/apps/preinstalled)
	async listPreinstalledApps(image_id: string): Promise<{
		code: number;
		data: {
			preinstalled: Array<{
				package_name: string;
				app_name: string;
				version: string;
				size: number;
				category: string;
			}>;
			total: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/apps/preinstalled");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: { preinstalled: [], total: 0 },
				message: "Device not found",
			};
		}

		try {
			// Simulate preinstalled apps
			const preinstalledApps = [
				{
					package_name: "com.android.settings",
					app_name: "Settings",
					version: "15.0.0",
					size: 25000000,
					category: "System",
				},
				{
					package_name: "com.google.android.gms",
					app_name: "Google Play Services",
					version: "23.45.12",
					size: 85000000,
					category: "Services",
				},
				{
					package_name: "com.google.android.youtube",
					app_name: "YouTube",
					version: "18.45.41",
					size: 125000000,
					category: "Entertainment",
				},
				{
					package_name: "com.android.systemui",
					app_name: "System UI",
					version: "15.0.0",
					size: 45000000,
					category: "System",
				},
				{
					package_name: "com.google.android.dialer",
					app_name: "Phone",
					version: "78.0.123456789",
					size: 18000000,
					category: "Communication",
				},
			];

			return {
				code: 200,
				data: {
					preinstalled: preinstalledApps,
					total: preinstalledApps.length,
				},
				message: "Success",
			};
		} catch (error) {
			return {
				code: 500,
				data: { preinstalled: [], total: 0 },
				message:
					"Failed to list preinstalled apps: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Team Management Methods

	// List teams (GET /api/v1/team/list)
	async listTeams(options?: {
		search?: string;
		limit?: number;
		offset?: number;
	}): Promise<{
		code: number;
		data: {
			teams: Array<{
				id: string;
				name: string;
				description: string;
				created_at: string;
				member_count: number;
				device_count: number;
				status: "active" | "inactive";
			}>;
			total: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: GET /api/v1/team/list");

		try {
			// Simulate team data
			const teams = [
				{
					id: "team_001",
					name: "Development Team",
					description: "Main development and testing team",
					created_at: "2025-01-15T10:00:00Z",
					member_count: 8,
					device_count: 12,
					status: "active" as const,
				},
				{
					id: "team_002",
					name: "QA Team",
					description: "Quality assurance and testing team",
					created_at: "2025-01-20T14:30:00Z",
					member_count: 5,
					device_count: 8,
					status: "active" as const,
				},
				{
					id: "team_003",
					name: "Operations",
					description: "Operations and maintenance team",
					created_at: "2025-01-10T09:15:00Z",
					member_count: 6,
					device_count: 10,
					status: "inactive" as const,
				},
			];

			// Apply filters
			let filteredTeams = teams;
			if (options?.search) {
				filteredTeams = teams.filter(
					(team) =>
						team.name.toLowerCase().includes(options.search?.toLowerCase()) ||
						team.description
							.toLowerCase()
							.includes(options.search?.toLowerCase()),
				);
			}

			// Apply pagination
			const total = filteredTeams.length;
			const offset = options?.offset || 0;
			const limit = options?.limit || 50;
			const paginatedTeams = filteredTeams.slice(offset, offset + limit);

			return {
				code: 200,
				data: {
					teams: paginatedTeams,
					total,
				},
				message: "Success",
			};
		} catch (error) {
			return {
				code: 500,
				data: { teams: [], total: 0 },
				message:
					"Failed to list teams: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// List team members (GET /api/v1/team/members)
	async listTeamMembers(
		_team_id?: string,
		options?: {
			search?: string;
			role?: "admin" | "member" | "viewer";
			limit?: number;
			offset?: number;
		},
	): Promise<{
		code: number;
		data: {
			members: Array<{
				id: string;
				name: string;
				email: string;
				role: "admin" | "member" | "viewer";
				joined_at: string;
				last_active: string;
				status: "active" | "inactive";
			}>;
			total: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: GET /api/v1/team/members");

		try {
			// Simulate member data
			const members = [
				{
					id: "user_001",
					name: "John Smith",
					email: "john.smith@company.com",
					role: "admin" as const,
					joined_at: "2025-01-15T10:00:00Z",
					last_active: "2026-01-26T07:00:00Z",
					status: "active" as const,
				},
				{
					id: "user_002",
					name: "Sarah Johnson",
					email: "sarah.j@company.com",
					role: "member" as const,
					joined_at: "2025-01-16T11:30:00Z",
					last_active: "2026-01-25T16:45:00Z",
					status: "active" as const,
				},
				{
					id: "user_003",
					name: "Mike Chen",
					email: "mike.chen@company.com",
					role: "member" as const,
					joined_at: "2025-01-18T09:00:00Z",
					last_active: "2026-01-24T14:20:00Z",
					status: "active" as const,
				},
				{
					id: "user_004",
					name: "Emily Davis",
					email: "emily.d@company.com",
					role: "viewer" as const,
					joined_at: "2025-01-20T13:15:00Z",
					last_active: "2026-01-22T10:30:00Z",
					status: "inactive" as const,
				},
				{
					id: "user_005",
					name: "Robert Wilson",
					email: "robert.w@company.com",
					role: "member" as const,
					joined_at: "2025-01-22T15:45:00Z",
					last_active: "2026-01-26T08:15:00Z",
					status: "active" as const,
				},
			];

			// Apply filters
			let filteredMembers = members;
			if (options?.role) {
				filteredMembers = members.filter(
					(member) => member.role === options.role,
				);
			}

			if (options?.search) {
				filteredMembers = filteredMembers.filter(
					(member) =>
						member.name.toLowerCase().includes(options.search?.toLowerCase()) ||
						member.email.toLowerCase().includes(options.search?.toLowerCase()),
				);
			}

			// Apply pagination
			const total = filteredMembers.length;
			const offset = options?.offset || 0;
			const limit = options?.limit || 50;
			const paginatedMembers = filteredMembers.slice(offset, offset + limit);

			return {
				code: 200,
				data: {
					members: paginatedMembers,
					total,
				},
				message: "Success",
			};
		} catch (error) {
			return {
				code: 500,
				data: { members: [], total: 0 },
				message:
					"Failed to list members: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Invite team members (POST /api/v1/team/invite)
	async inviteTeamMembers(
		invitations: Array<{
			email: string;
			role: "admin" | "member" | "viewer";
			team_id?: string;
			message?: string;
		}>,
	): Promise<{
		code: number;
		data: {
			invitations: Array<{
				email: string;
				role: string;
				status: "sent" | "failed";
				invitation_id?: string;
				error?: string;
			}>;
			successful: string[];
			failed: string[];
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/team/invite");

		try {
			const results = [];
			const successful: string[] = [];
			const failed: string[] = [];

			for (const invitation of invitations) {
				// Simulate invitation sending
				const isSuccess = Math.random() > 0.2; // 80% success rate

				if (isSuccess) {
					const invitationResult = {
						email: invitation.email,
						role: invitation.role,
						status: "sent" as const,
						invitation_id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					};
					results.push(invitationResult);
					successful.push(invitation.email);
				} else {
					const invitationResult = {
						email: invitation.email,
						role: invitation.role,
						status: "failed" as const,
						error: "Email already invited or invalid email address",
					};
					results.push(invitationResult);
					failed.push(invitation.email);
				}
			}

			return {
				code: 200,
				data: {
					invitations: results,
					successful,
					failed,
				},
				message:
					failed.length === 0
						? "All invitations sent successfully"
						: "Some invitations failed",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					invitations: [],
					successful: [],
					failed: invitations.map((inv) => inv.email),
				},
				message:
					"Failed to send invitations: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// List team groups (GET /api/v1/team/groups)
	async listTeamGroups(
		_team_id?: string,
		options?: {
			search?: string;
			limit?: number;
			offset?: number;
		},
	): Promise<{
		code: number;
		data: {
			groups: Array<{
				id: string;
				name: string;
				description: string;
				created_at: string;
				member_count: number;
				permissions: string[];
			}>;
			total: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: GET /api/v1/team/groups");

		try {
			// Simulate group data
			const groups = [
				{
					id: "group_001",
					name: "Developers",
					description: "Full access to development devices",
					created_at: "2025-01-15T10:30:00Z",
					member_count: 4,
					permissions: ["device_control", "app_install", "file_access"],
				},
				{
					id: "group_002",
					name: "Testers",
					description: "Testing and QA permissions",
					created_at: "2025-01-16T14:00:00Z",
					member_count: 3,
					permissions: ["device_view", "app_install", "screenshot"],
				},
				{
					id: "group_003",
					name: "Viewers",
					description: "Read-only access to devices",
					created_at: "2025-01-17T09:15:00Z",
					member_count: 2,
					permissions: ["device_view", "status_read"],
				},
			];

			// Apply filters
			let filteredGroups = groups;
			if (options?.search) {
				filteredGroups = groups.filter(
					(group) =>
						group.name.toLowerCase().includes(options.search?.toLowerCase()) ||
						group.description
							.toLowerCase()
							.includes(options.search?.toLowerCase()),
				);
			}

			// Apply pagination
			const total = filteredGroups.length;
			const offset = options?.offset || 0;
			const limit = options?.limit || 50;
			const paginatedGroups = filteredGroups.slice(offset, offset + limit);

			return {
				code: 200,
				data: {
					groups: paginatedGroups,
					total,
				},
				message: "Success",
			};
		} catch (error) {
			return {
				code: 500,
				data: { groups: [], total: 0 },
				message:
					"Failed to list groups: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Share resources (POST /api/v1/team/share)
	async shareResources(share_data: {
		type: "device" | "file" | "screenshot";
		resource_id: string;
		team_id?: string;
		group_id?: string;
		user_emails?: string[];
		permissions: Array<"view" | "control" | "download" | "upload">;
		expires_at?: string;
		message?: string;
	}): Promise<{
		code: number;
		data: {
			shares: Array<{
				id: string;
				type: string;
				resource_id: string;
				shared_with: string[];
				permissions: string[];
				created_at: string;
				expires_at?: string;
				share_url?: string;
			}>;
			permissions: {
				share_id: string;
				permissions: string[];
			};
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/team/share");

		try {
			const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const shareUrl = `https://duoplus.com/share/${shareId}`;

			// Determine who it's shared with
			const sharedWith: string[] = [];
			if (share_data.team_id) sharedWith.push(`team:${share_data.team_id}`);
			if (share_data.group_id) sharedWith.push(`group:${share_data.group_id}`);
			if (share_data.user_emails) sharedWith.push(...share_data.user_emails);

			const share = {
				id: shareId,
				type: share_data.type,
				resource_id: share_data.resource_id,
				shared_with: sharedWith,
				permissions: share_data.permissions,
				created_at: new Date().toISOString(),
				expires_at: share_data.expires_at,
				share_url: shareUrl,
			};

			return {
				code: 200,
				data: {
					shares: [share],
					permissions: {
						share_id: shareId,
						permissions: share_data.permissions,
					},
				},
				message: "Resource shared successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					shares: [],
					permissions: {
						share_id: "error",
						permissions: [],
					},
				},
				message:
					"Failed to share resource: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Device Operations Methods

	// Restart device (POST /api/v1/cloudPhone/restart)
	async restartDevice(
		image_id: string,
		options?: {
			force?: boolean;
			wait_time?: number;
		},
	): Promise<{
		code: number;
		data: {
			restarts: {
				[image_id: string]: {
					restart_time: string;
					previous_status: string;
					new_status: string;
					success: boolean;
				};
			};
			success: string[];
			fail: string[];
			fail_reason: { [image_id: string]: string };
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/restart");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					restarts: {},
					success: [],
					fail: [image_id],
					fail_reason: { [image_id]: "Device not found" },
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						restarts: {},
						success: [],
						fail: [image_id],
						fail_reason: { [image_id]: "Device must be powered on to restart" },
					},
					message: "Device must be powered on to restart",
				};
			}

			const previousStatus = device.status;
			const restartTime = new Date().toISOString();

			// Simulate restart process
			const restartCommand = options?.force ? "reboot -f" : "reboot";
			const adbResult = await this.executeADBCommand(image_id, restartCommand);

			if (adbResult.code === 200 && adbResult.data.success) {
				// Device restarts and comes back online
				device.status = "device"; // Device comes back online
				device.power_state = "on";
				this.deviceMap.set(image_id, device);

				return {
					code: 200,
					data: {
						restarts: {
							[image_id]: {
								restart_time: restartTime,
								previous_status: previousStatus,
								new_status: device.status,
								success: true,
							},
						},
						success: [image_id],
						fail: [],
						fail_reason: {},
					},
					message: "Device restarted successfully",
				};
			} else {
				return {
					code: 500,
					data: {
						restarts: {},
						success: [],
						fail: [image_id],
						fail_reason: { [image_id]: "Restart command failed" },
					},
					message: "Device restart failed",
				};
			}
		} catch (error) {
			return {
				code: 500,
				data: {
					restarts: {},
					success: [],
					fail: [image_id],
					fail_reason: {
						[image_id]:
							"Device restart failed: " +
							(error instanceof Error ? error.message : "Unknown error"),
					},
				},
				message: "Device restart failed",
			};
		}
	}

	// Transfer device (POST /api/v1/cloudPhone/transfer)
	async transferDevice(
		image_id: string,
		target_user: string,
		_options?: {
			message?: string;
			preserve_data?: boolean;
		},
	): Promise<{
		code: number;
		data: {
			transfers: {
				[image_id: string]: {
					transfer_time: string;
					from_user: string;
					to_user: string;
					success: boolean;
					transfer_id: string;
				};
			};
			success: string[];
			fail: string[];
			fail_reason: { [image_id: string]: string };
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/transfer");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					transfers: {},
					success: [],
					fail: [image_id],
					fail_reason: { [image_id]: "Device not found" },
				},
				message: "Device not found",
			};
		}

		try {
			const transferTime = new Date().toISOString();
			const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const fromUser = "current_user"; // Simulate current user

			// Simulate transfer process
			const transferResult = {
				transfer_time: transferTime,
				from_user: fromUser,
				to_user: target_user,
				success: true,
				transfer_id: transferId,
			};

			// Update device ownership (simulation)
			device.duoplusDevice = true;
			this.deviceMap.set(image_id, device);

			return {
				code: 200,
				data: {
					transfers: {
						[image_id]: transferResult,
					},
					success: [image_id],
					fail: [],
					fail_reason: {},
				},
				message: "Device transferred successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					transfers: {},
					success: [],
					fail: [image_id],
					fail_reason: {
						[image_id]:
							"Device transfer failed: " +
							(error instanceof Error ? error.message : "Unknown error"),
					},
				},
				message: "Device transfer failed",
			};
		}
	}

	// Focus mode (POST /api/v1/cloudPhone/focus-mode)
	async setFocusMode(
		image_id: string,
		mode: "none" | "work" | "gaming" | "reading",
		options?: {
			block_notifications?: boolean;
			block_calls?: boolean;
			whitelist_apps?: string[];
		},
	): Promise<{
		code: number;
		data: {
			focus_settings: {
				mode: string;
				enabled: boolean;
				block_notifications: boolean;
				block_calls: boolean;
				whitelist_apps: string[];
				activated_time: string;
			};
			enabled: boolean;
			mode: string;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/focus-mode");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					focus_settings: {
						mode: "none",
						enabled: false,
						block_notifications: false,
						block_calls: false,
						whitelist_apps: [],
						activated_time: "",
					},
					enabled: false,
					mode: "none",
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						focus_settings: {
							mode: "none",
							enabled: false,
							block_notifications: false,
							block_calls: false,
							whitelist_apps: [],
							activated_time: "",
						},
						enabled: false,
						mode: "none",
					},
					message: "Device must be powered on to set focus mode",
				};
			}

			const activatedTime = new Date().toISOString();
			const isEnabled = mode !== "none";

			// Simulate focus mode setting
			const focusSettings = {
				mode: mode,
				enabled: isEnabled,
				block_notifications: options?.block_notifications || false,
				block_calls: options?.block_calls || false,
				whitelist_apps: options?.whitelist_apps || [],
				activated_time: activatedTime,
			};

			return {
				code: 200,
				data: {
					focus_settings: focusSettings,
					enabled: isEnabled,
					mode: mode,
				},
				message: `Focus mode set to ${mode} successfully`,
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					focus_settings: {
						mode: "none",
						enabled: false,
						block_notifications: false,
						block_calls: false,
						whitelist_apps: [],
						activated_time: "",
					},
					enabled: false,
					mode: "none",
				},
				message:
					"Failed to set focus mode: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// 2FA management (POST /api/v1/cloudPhone/2fa)
	async manage2FA(
		image_id: string,
		action: "enable" | "disable" | "generate-backup-codes",
		_options?: {
			app_name?: string;
			secret?: string;
		},
	): Promise<{
		code: number;
		data: {
			two_factor: {
				enabled: boolean;
				secret?: string;
				qr_code?: string;
				backup_codes: string[];
				setup_time?: string;
			};
			enabled: boolean;
			backup_codes: string[];
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/2fa");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					two_factor: {
						enabled: false,
						backup_codes: [],
					},
					enabled: false,
					backup_codes: [],
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						two_factor: {
							enabled: false,
							backup_codes: [],
						},
						enabled: false,
						backup_codes: [],
					},
					message: "Device must be powered on to manage 2FA",
				};
			}

			const setupTime = new Date().toISOString();

			if (action === "enable") {
				const secret = "ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZA567";
				const qrCode = `otpauth://totp/Duoplus:${image_id}?secret=${secret}&issuer=Duoplus`;

				return {
					code: 200,
					data: {
						two_factor: {
							enabled: true,
							secret: secret,
							qr_code: qrCode,
							backup_codes: [],
							setup_time: setupTime,
						},
						enabled: true,
						backup_codes: [],
					},
					message: "2FA enabled successfully",
				};
			} else if (action === "disable") {
				return {
					code: 200,
					data: {
						two_factor: {
							enabled: false,
							backup_codes: [],
						},
						enabled: false,
						backup_codes: [],
					},
					message: "2FA disabled successfully",
				};
			} else if (action === "generate-backup-codes") {
				const backupCodes = Array.from(
					{ length: 10 },
					(_, _i) =>
						`${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}`,
				);

				return {
					code: 200,
					data: {
						two_factor: {
							enabled: true,
							backup_codes: backupCodes,
						},
						enabled: true,
						backup_codes: backupCodes,
					},
					message: "Backup codes generated successfully",
				};
			} else {
				return {
					code: 400,
					data: {
						two_factor: {
							enabled: false,
							backup_codes: [],
						},
						enabled: false,
						backup_codes: [],
					},
					message: "Invalid 2FA action",
				};
			}
		} catch (error) {
			return {
				code: 500,
				data: {
					two_factor: {
						enabled: false,
						backup_codes: [],
					},
					enabled: false,
					backup_codes: [],
				},
				message:
					"Failed to manage 2FA: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Clean device (POST /api/v1/cloudPhone/clean)
	async cleanDevice(
		image_id: string,
		options?: {
			clean_cache?: boolean;
			clean_logs?: boolean;
			clean_temp?: boolean;
			preserve_data?: boolean;
		},
	): Promise<{
		code: number;
		data: {
			clean_results: {
				[image_id: string]: {
					clean_time: string;
					cache_cleared: boolean;
					logs_cleared: boolean;
					temp_cleared: boolean;
					space_freed: number;
					success: boolean;
				};
			};
			success: string[];
			fail: string[];
			fail_reason: { [image_id: string]: string };
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/clean");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					clean_results: {},
					success: [],
					fail: [image_id],
					fail_reason: { [image_id]: "Device not found" },
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						clean_results: {},
						success: [],
						fail: [image_id],
						fail_reason: { [image_id]: "Device must be powered on to clean" },
					},
					message: "Device must be powered on to clean",
				};
			}

			const cleanTime = new Date().toISOString();
			const spaceFreed = Math.floor(Math.random() * 1000000000) + 100000000; // 100MB - 1GB

			// Simulate cleaning process
			const cleanCommands = [];
			if (options?.clean_cache !== false) cleanCommands.push("rm -rf /cache/*");
			if (options?.clean_logs !== false)
				cleanCommands.push("rm -rf /data/log/*");
			if (options?.clean_temp !== false)
				cleanCommands.push("rm -rf /data/local/tmp/*");

			for (const command of cleanCommands) {
				await this.executeADBCommand(image_id, command);
			}

			const cleanResult = {
				clean_time: cleanTime,
				cache_cleared: options?.clean_cache !== false,
				logs_cleared: options?.clean_logs !== false,
				temp_cleared: options?.clean_temp !== false,
				space_freed: spaceFreed,
				success: true,
			};

			return {
				code: 200,
				data: {
					clean_results: {
						[image_id]: cleanResult,
					},
					success: [image_id],
					fail: [],
					fail_reason: {},
				},
				message: "Device cleaned successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					clean_results: {},
					success: [],
					fail: [image_id],
					fail_reason: {
						[image_id]:
							"Device cleaning failed: " +
							(error instanceof Error ? error.message : "Unknown error"),
					},
				},
				message: "Device cleaning failed",
			};
		}
	}

	// Backup device (POST /api/v1/cloudPhone/backup)
	async backupDevice(
		image_id: string,
		options?: {
			include_apps?: boolean;
			include_data?: boolean;
			include_settings?: boolean;
			backup_location?: string;
		},
	): Promise<{
		code: number;
		data: {
			backup_results: {
				[image_id: string]: {
					backup_time: string;
					backup_id: string;
					backup_size: number;
					backup_location: string;
					included_apps: boolean;
					included_data: boolean;
					included_settings: boolean;
					success: boolean;
				};
			};
			backup_id: string;
			backup_size: number;
			backup_time: string;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/backup");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					backup_results: {},
					backup_id: "",
					backup_size: 0,
					backup_time: "",
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						backup_results: {},
						backup_id: "",
						backup_size: 0,
						backup_time: "",
					},
					message: "Device must be powered on to backup",
				};
			}

			const backupTime = new Date().toISOString();
			const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const backupSize = Math.floor(Math.random() * 5000000000) + 1000000000; // 1GB - 6GB
			const backupLocation = options?.backup_location || "/cloud/backups/";

			// Simulate backup process
			const backupCommands = [];
			if (options?.include_apps !== false)
				backupCommands.push("tar -czf /data/backup/apps.tar.gz /data/app/");
			if (options?.include_data !== false)
				backupCommands.push("tar -czf /data/backup/data.tar.gz /data/data/");
			if (options?.include_settings !== false)
				backupCommands.push("tar -czf /data/backup/settings.tar.gz /system/");

			for (const command of backupCommands) {
				await this.executeADBCommand(image_id, command);
			}

			const backupResult = {
				backup_time: backupTime,
				backup_id: backupId,
				backup_size: backupSize,
				backup_location: backupLocation,
				included_apps: options?.include_apps !== false,
				included_data: options?.include_data !== false,
				included_settings: options?.include_settings !== false,
				success: true,
			};

			return {
				code: 200,
				data: {
					backup_results: {
						[image_id]: backupResult,
					},
					backup_id: backupId,
					backup_size: backupSize,
					backup_time: backupTime,
				},
				message: "Device backed up successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					backup_results: {},
					backup_id: "",
					backup_size: 0,
					backup_time: "",
				},
				message:
					"Device backup failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Advanced Functions Methods

	// Root access (POST /api/v1/cloudPhone/root)
	async manageRootAccess(
		image_id: string,
		action: "enable" | "disable" | "status",
		options?: {
			method?: "systemless" | "full";
			preserve_warranty?: boolean;
		},
	): Promise<{
		code: number;
		data: {
			root_status: {
				[image_id: string]: {
					action: string;
					root_enabled: boolean;
					method?: string;
					access_time: string;
					success: boolean;
				};
			};
			success: string[];
			fail: string[];
			fail_reason: { [image_id: string]: string };
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/root");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					root_status: {},
					success: [],
					fail: [image_id],
					fail_reason: { [image_id]: "Device not found" },
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						root_status: {},
						success: [],
						fail: [image_id],
						fail_reason: {
							[image_id]: "Device must be powered on to manage root access",
						},
					},
					message: "Device must be powered on to manage root access",
				};
			}

			const accessTime = new Date().toISOString();
			const method = options?.method || "systemless";

			let rootStatus;
			if (action === "enable") {
				rootStatus = {
					action: action,
					root_enabled: true,
					method: method,
					access_time: accessTime,
					success: true,
				};
			} else if (action === "disable") {
				rootStatus = {
					action: action,
					root_enabled: false,
					access_time: accessTime,
					success: true,
				};
			} else {
				// status
				rootStatus = {
					action: action,
					root_enabled: Math.random() > 0.5, // Random status for demo
					access_time: accessTime,
					success: true,
				};
			}

			return {
				code: 200,
				data: {
					root_status: {
						[image_id]: rootStatus,
					},
					success: [image_id],
					fail: [],
					fail_reason: {},
				},
				message: `Root access ${action} completed successfully`,
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					root_status: {},
					success: [],
					fail: [image_id],
					fail_reason: {
						[image_id]:
							"Root access management failed: " +
							(error instanceof Error ? error.message : "Unknown error"),
					},
				},
				message: "Root access management failed",
			};
		}
	}

	// QR code scanning (POST /api/v1/cloudPhone/qr-scan)
	async scanQRCode(
		image_id: string,
		options?: {
			scan_type?: "camera" | "screenshot";
			format?: "qr" | "barcode" | "all";
		},
	): Promise<{
		code: number;
		data: {
			scan_results: {
				[image_id: string]: {
					qr_data: string;
					scan_time: string;
					format: string;
					confidence: number;
					success: boolean;
				};
			};
			qr_data: string;
			scan_time: string;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/qr-scan");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					scan_results: {},
					qr_data: "",
					scan_time: "",
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						scan_results: {},
						qr_data: "",
						scan_time: "",
					},
					message: "Device must be powered on to scan QR codes",
				};
			}

			const scanTime = new Date().toISOString();
			const _scanType = options?.scan_type || "camera";
			const format = options?.format || "qr";

			// Simulate QR code scanning
			const sampleQRData = [
				"https://duoplus.com/device/DUOPLUS-OPPO-FIND-X7",
				"WIFI:T:WPA;S:DuoplusNetwork;P:password123;;",
				"BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD",
				"duoplus-backup-2025-01-26-token-abc123def456",
			];

			const qrData =
				sampleQRData[Math.floor(Math.random() * sampleQRData.length)];

			const scanResult = {
				qr_data: qrData,
				scan_time: scanTime,
				format: format,
				confidence: Math.floor(Math.random() * 20) + 80, // 80-99% confidence
				success: true,
			};

			return {
				code: 200,
				data: {
					scan_results: {
						[image_id]: scanResult,
					},
					qr_data: qrData,
					scan_time: scanTime,
				},
				message: "QR code scanned successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					scan_results: {},
					qr_data: "",
					scan_time: "",
				},
				message:
					"QR code scanning failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Resolution change (POST /api/v1/cloudPhone/resolution)
	async changeResolution(
		image_id: string,
		resolution: string,
		options?: {
			refresh_rate?: number;
			density?: number;
		},
	): Promise<{
		code: number;
		data: {
			resolution_results: {
				[image_id: string]: {
					current_resolution: string;
					new_resolution: string;
					refresh_rate: number;
					density: number;
					change_time: string;
					success: boolean;
				};
			};
			current_resolution: string;
			new_resolution: string;
			success: boolean;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/resolution");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					resolution_results: {},
					current_resolution: "",
					new_resolution: "",
					success: false,
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						resolution_results: {},
						current_resolution: "",
						new_resolution: "",
						success: false,
					},
					message: "Device must be powered on to change resolution",
				};
			}

			const validResolutions = [
				"1080x1920",
				"1080x2340",
				"1440x3120",
				"720x1280",
				"2160x3840",
			];
			if (!validResolutions.includes(resolution)) {
				return {
					code: 400,
					data: {
						resolution_results: {},
						current_resolution: "1080x2340",
						new_resolution: "",
						success: false,
					},
					message:
						"Invalid resolution. Valid options: 1080x1920, 1080x2340, 1440x3120, 720x1280, 2160x3840",
				};
			}

			const changeTime = new Date().toISOString();
			const currentResolution = "1080x2340";
			const refreshRate = options?.refresh_rate || 60;
			const density = options?.density || 420;

			// Simulate resolution change
			const adbResult = await this.executeADBCommand(
				image_id,
				`wm size ${resolution}`,
			);

			if (adbResult.code === 200 && adbResult.data.success) {
				const resolutionResult = {
					current_resolution: currentResolution,
					new_resolution: resolution,
					refresh_rate: refreshRate,
					density: density,
					change_time: changeTime,
					success: true,
				};

				return {
					code: 200,
					data: {
						resolution_results: {
							[image_id]: resolutionResult,
						},
						current_resolution: currentResolution,
						new_resolution: resolution,
						success: true,
					},
					message: "Resolution changed successfully",
				};
			} else {
				return {
					code: 500,
					data: {
						resolution_results: {},
						current_resolution: currentResolution,
						new_resolution: "",
						success: false,
					},
					message: "Resolution change failed",
				};
			}
		} catch (error) {
			return {
				code: 500,
				data: {
					resolution_results: {},
					current_resolution: "",
					new_resolution: "",
					success: false,
				},
				message:
					"Resolution change failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Live streaming (POST /api/v1/cloudPhone/streaming)
	async startStreaming(
		image_id: string,
		options?: {
			quality?: "low" | "medium" | "high" | "ultra";
			fps?: number;
			bitrate?: number;
			audio?: boolean;
		},
	): Promise<{
		code: number;
		data: {
			streaming_status: {
				[image_id: string]: {
					stream_url: string;
					quality: string;
					fps: number;
					bitrate: number;
					audio_enabled: boolean;
					start_time: string;
					viewers: number;
					success: boolean;
				};
			};
			stream_url: string;
			quality: string;
			bitrate: number;
			fps: number;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/streaming");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					streaming_status: {},
					stream_url: "",
					quality: "",
					bitrate: 0,
					fps: 0,
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						streaming_status: {},
						stream_url: "",
						quality: "",
						bitrate: 0,
						fps: 0,
					},
					message: "Device must be powered on to start streaming",
				};
			}

			const startTime = new Date().toISOString();
			const quality = options?.quality || "medium";
			const fps = options?.fps || (quality === "ultra" ? 60 : 30);
			const bitrate =
				options?.bitrate ||
				(quality === "ultra"
					? 8000
					: quality === "high"
						? 4000
						: quality === "medium"
							? 2000
							: 1000);
			const audioEnabled = options?.audio !== false;
			const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const streamUrl = `https://stream.duoplus.com/live/${streamId}`;

			// Simulate streaming start
			const streamingResult = {
				stream_url: streamUrl,
				quality: quality,
				fps: fps,
				bitrate: bitrate,
				audio_enabled: audioEnabled,
				start_time: startTime,
				viewers: Math.floor(Math.random() * 100),
				success: true,
			};

			return {
				code: 200,
				data: {
					streaming_status: {
						[image_id]: streamingResult,
					},
					stream_url: streamUrl,
					quality: quality,
					bitrate: bitrate,
					fps: fps,
				},
				message: "Streaming started successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					streaming_status: {},
					stream_url: "",
					quality: "",
					bitrate: 0,
					fps: 0,
				},
				message:
					"Streaming failed to start: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Quality adjustment (POST /api/v1/cloudPhone/quality)
	async adjustQuality(
		image_id: string,
		quality: "low" | "medium" | "high" | "ultra" | "auto",
		options?: {
			adaptive?: boolean;
			save_power?: boolean;
		},
	): Promise<{
		code: number;
		data: {
			quality_settings: {
				[image_id: string]: {
					current_quality: string;
					new_quality: string;
					adaptive_enabled: boolean;
					power_saving: boolean;
					adjustment_time: string;
					adjusted: boolean;
				};
			};
			current_quality: string;
			new_quality: string;
			adjusted: boolean;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/quality");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					quality_settings: {},
					current_quality: "",
					new_quality: "",
					adjusted: false,
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						quality_settings: {},
						current_quality: "",
						new_quality: "",
						adjusted: false,
					},
					message: "Device must be powered on to adjust quality",
				};
			}

			const adjustmentTime = new Date().toISOString();
			const currentQuality = "medium";
			const adaptiveEnabled = options?.adaptive || false;
			const powerSaving = options?.save_power || false;

			// Simulate quality adjustment
			const qualityResult = {
				current_quality: currentQuality,
				new_quality: quality,
				adaptive_enabled: adaptiveEnabled,
				power_saving: powerSaving,
				adjustment_time: adjustmentTime,
				adjusted: true,
			};

			return {
				code: 200,
				data: {
					quality_settings: {
						[image_id]: qualityResult,
					},
					current_quality: currentQuality,
					new_quality: quality,
					adjusted: true,
				},
				message: "Quality adjusted successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					quality_settings: {},
					current_quality: "",
					new_quality: "",
					adjusted: false,
				},
				message:
					"Quality adjustment failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	// Route selection (POST /api/v1/cloudPhone/route)
	async selectRoute(
		image_id: string,
		route: "direct" | "optimized" | "secure" | "balanced",
		options?: {
			force_change?: boolean;
			test_speed?: boolean;
		},
	): Promise<{
		code: number;
		data: {
			route_settings: {
				[image_id: string]: {
					current_route: string;
					new_route: string;
					latency_ms: number;
					bandwidth_mbps: number;
					secure: boolean;
					selection_time: string;
					optimized: boolean;
				};
			};
			current_route: string;
			new_route: string;
			optimized: boolean;
		};
		message: string;
	}> {
		this.commandHistory.push("api: POST /api/v1/cloudPhone/route");

		const device = this.deviceMap.get(image_id);

		if (!device) {
			return {
				code: 404,
				data: {
					route_settings: {},
					current_route: "",
					new_route: "",
					optimized: false,
				},
				message: "Device not found",
			};
		}

		try {
			// Check if device is powered on
			if (device.status !== "device" || device.power_state !== "on") {
				return {
					code: 400,
					data: {
						route_settings: {},
						current_route: "",
						new_route: "",
						optimized: false,
					},
					message: "Device must be powered on to select route",
				};
			}

			const selectionTime = new Date().toISOString();
			const currentRoute = "direct";
			const _testSpeed = options?.test_speed || false;

			// Simulate route metrics based on route type
			let latency, bandwidth, secure;
			switch (route) {
				case "direct":
					latency = 15;
					bandwidth = 100;
					secure = false;
					break;
				case "optimized":
					latency = 25;
					bandwidth = 150;
					secure = false;
					break;
				case "secure":
					latency = 35;
					bandwidth = 80;
					secure = true;
					break;
				case "balanced":
					latency = 20;
					bandwidth = 120;
					secure = true;
					break;
				default:
					latency = 20;
					bandwidth = 100;
					secure = false;
			}

			const routeResult = {
				current_route: currentRoute,
				new_route: route,
				latency_ms: latency,
				bandwidth_mbps: bandwidth,
				secure: secure,
				selection_time: selectionTime,
				optimized: route !== "direct",
			};

			return {
				code: 200,
				data: {
					route_settings: {
						[image_id]: routeResult,
					},
					current_route: currentRoute,
					new_route: route,
					optimized: route !== "direct",
				},
				message: "Route selected successfully",
			};
		} catch (error) {
			return {
				code: 500,
				data: {
					route_settings: {},
					current_route: "",
					new_route: "",
					optimized: false,
				},
				message:
					"Route selection failed: " +
					(error instanceof Error ? error.message : "Unknown error"),
			};
		}
	}

	async getRealDeviceStatus(): Promise<{
		online: boolean;
		device: MockDevice | undefined;
		lastSeen: string;
		connectionType: string;
		duoplusEndpoint: string;
	}> {
		const device = Array.from(this.deviceMap.values())[0]; // Get first device for demo

		return {
			online: true,
			device: device,
			lastSeen: new Date().toISOString(),
			connectionType: "cloud",
			duoplusEndpoint: this.duoplusEndpoint,
		};
	}

	async executeRealCommand(
		serial: string,
		command: string,
	): Promise<{
		success: boolean;
		output: string;
		device: string | undefined;
		timestamp: string;
	}> {
		this.commandHistory.push(`real-cmd: ${command}`);
		const device = this.deviceMap.get(serial);
		return {
			success: true,
			output: await this.shell(serial, command),
			device: device?.model,
			timestamp: new Date().toISOString(),
		};
	}

	async getDeviceFingerprint(serial: string): Promise<{
		manufacturer: string | undefined;
		model: string | undefined;
		brand: string | undefined;
		androidVersion: string | undefined;
		buildFingerprint: string;
		bootloader: string;
		hardware: string;
		board: string;
		display: string;
		fingerprint: string | undefined;
		secure: boolean;
		systemIntegrity: boolean;
		duoplusVerified: boolean | undefined;
	}> {
		const device = this.deviceMap.get(serial);
		return {
			manufacturer: device?.manufacturer,
			model: device?.model,
			brand: device?.brand,
			androidVersion: device?.androidVersion,
			buildFingerprint: `${device?.brand}/${device?.product}/${device?.device}:${device?.androidVersion}/TP1A.220624.002/8768475:user/release-keys`,
			bootloader: "unknown",
			hardware: "qcom",
			board: "find_x7",
			display: "TP1A.220624.002",
			fingerprint: device?.bluetoothMAC,
			secure: true,
			systemIntegrity: true,
			duoplusVerified: device?.duoplusDevice,
		};
	}

	async validateSecurityCompliance(serial: string): Promise<{
		isGenuine: boolean;
		isNotEmulator: boolean;
		isNotRooted: boolean;
		isSecureBoot: boolean;
		isSystemIntegrity: boolean;
		passesAllChecks: boolean;
		riskScore: number;
		complianceDetails: {
			genuineHardware: boolean;
			officialBuild: boolean;
			secureBoot: boolean;
			systemPartition: boolean;
			verifiedBoot: boolean;
			selinuxEnforcing: boolean;
			noDebugging: boolean;
			noRootAccess: boolean;
		};
		fingerprint: {
			manufacturer: string | undefined;
			model: string | undefined;
			brand: string | undefined;
			androidVersion: string | undefined;
			buildFingerprint: string;
			bootloader: string;
			hardware: string;
			board: string;
			display: string;
			fingerprint: string | undefined;
			secure: boolean;
			systemIntegrity: boolean;
			duoplusVerified: boolean | undefined;
		};
	}> {
		const _device = this.deviceMap.get(serial);
		const fingerprint = await this.getDeviceFingerprint(serial);
		return {
			isGenuine: true,
			isNotEmulator: true,
			isNotRooted: true,
			isSecureBoot: true,
			isSystemIntegrity: true,
			passesAllChecks: true,
			riskScore: 15,
			complianceDetails: {
				genuineHardware: true,
				officialBuild: true,
				secureBoot: true,
				systemPartition: true,
				verifiedBoot: true,
				selinuxEnforcing: true,
				noDebugging: true,
				noRootAccess: true,
			},
			fingerprint,
		};
	}

	simulateDeviceState(
		serial: string,
		state: "online" | "offline" | "unauthorized",
	): void {
		const device = this.deviceMap.get(serial);
		if (device) device.status = state;
	}

	simulateRootedDevice(serial: string): void {
		const device = this.deviceMap.get(serial);
		if (device) device.isRooted = true;
	}

	simulateEmulator(serial: string): void {
		const device = this.deviceMap.get(serial);
		if (device) {
			device.isEmulator = true;
			device.model = "sdk_google_phone_x86_64";
			device.product = "sdk_x86_64";
			device.device = "generic_x86_64";
		}
	}
}

let adbMockInstance: ADBMock | null = null;

export function getADBMock(): ADBMock {
	if (!adbMockInstance) adbMockInstance = new ADBMock();
	return adbMockInstance;
}

export function resetADBMock(): void {
	adbMockInstance = null;
}
