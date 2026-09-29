# Conveyor Belt AI System - Hardware Circuit Connection Details

This guide provides the complete wiring diagram, pin mapping, sensor calibration parameters, and operational instructions for running the **Conveyor Belt AI Industrial Monitoring & Joint Rupture Detection System** on a Raspberry Pi 4 / 5.

---

## 1. Raspberry Pi 4 / 5 Pinout Mapping

All sensors communicate with the Raspberry Pi using standard **SPI0**, **I2C1**, and **GPIO** pins.

| Component | Signal | Raspberry Pi Pin | Physical Pin # | Logic Level |
|---|---|---|---|---|
| **MCP3208 (ADC)** | VDD / VREF | 3.3V | Pin 1 | 3.3V |
| | AGND / DGND | Ground | Pin 6 | GND |
| | CLK (Clock) | GPIO 11 (SPI0 SCLK) | Pin 23 | 3.3V |
| | DIN (Data In) | GPIO 10 (SPI0 MOSI) | Pin 19 | 3.3V |
| | DOUT (Data Out) | GPIO 9 (SPI0 MISO) | Pin 21 | 3.3V |
| | CS/SHDN (Chip Select) | GPIO 8 (SPI0 CE0) | Pin 24 | 3.3V |
| **MCP3208 Channels** | CH0 (Channel 0) | Voltage Sensor Output | - | 0 - 3.3V Analog |
| | CH1 (Channel 1) | Current Sensor Output | - | 0 - 3.3V Analog |
| **ADXL345 (Vibration)** | VCC | 3.3V | Pin 1 | 3.3V |
| | GND | Ground | Pin 9 | GND |
| | SDA | GPIO 2 (I2C1 SDA) | Pin 3 | 3.3V |
| | SCL | GPIO 3 (I2C1 SCL) | Pin 5 | 3.3V |
| | CS | 3.3V (Selects I2C) | Pin 1 | 3.3V |
| | SDO | GND (Sets addr `0x53`) | Pin 9 | GND |
| **MLX90614 (Temperature)**| VIN | 3.3V | Pin 17 | 3.3V |
| | GND | Ground | Pin 14 | GND |
| | SDA | GPIO 2 (I2C1 SDA) | Pin 3 | 3.3V |
| | SCL | GPIO 3 (I2C1 SCL) | Pin 5 | 3.3V |
| **I2C LCD (16x2 PCF8574)** | VCC | 5V | Pin 2 | 5V |
| | GND | Ground | Pin 20 | GND |
| | SDA | GPIO 2 (I2C1 SDA) | Pin 3 | 3.3V (I2C Bus) |
| | SCL | GPIO 3 (I2C1 SCL) | Pin 5 | 3.3V (I2C Bus) |
| **Push Button (Trigger)** | Terminal 1 | GPIO 17 | Pin 11 | Internal Pull-Up |
| | Terminal 2 | Ground | Pin 14 | GND |

---

## 2. Sensor Signal Specifications & Calibration

### 2.1 Voltage Measurement (ZMPT101B / MCP3208 CH0)
- **Sensor**: ZMPT101B Active Single-Phase AC Voltage Sensor module or voltage divider.
- **Reference Voltage ($V_{REF}$)**: $3.3\text{ V}$
- **ADC Resolution**: 12-bit ($0 - 4095$)
- **Calibration Constant ($V_{CAL}$)**: $455.0$
- **Sampling Frequency**: $1000\text{ Hz}$ ($4000$ samples per burst $\approx 4\text{ seconds}$)

### 2.2 Current Measurement (SCT-013 / MCP3208 CH1)
- **Sensor**: SCT-013-000 Non-invasive AC Current Transformer (100A / 50mA) with burden resistor.
- **Raw Calibration**: $30.0$
- **Fine Correction**: $0.4 / 0.7$
- **Effective Calibration Constant ($I_{CAL}$)**: $\approx 17.14\text{ A/V}$

### 2.3 Vibration Measurement (ADXL345)
- **Bus**: I2C1 (address `0x53`)
- **Range Configuration**: $\pm 16\text{g}$ Full Resolution (`0x0B`)
- **Data Rate**: $1600\text{ Hz}$ bandwidth rate (`0x0E`)
- **Scale Factor**: $0.0039\text{ g/LSB}$
- **Acquisition**: 1024 samples burst across X, Y, Z axes.
- **Extracted Features**: RMS Vibration, Peak Acceleration, Kurtosis, Skewness, Variance, Peak-to-Peak, Dominant Frequency (FFT peak), Spectral Energy.

### 2.4 Motor Temperature (MLX90614)
- **Bus**: I2C1 (address `0x5A`)
- **Target Temperature Register**: `0x07` ($T_{OBJ1}$)
- **Formula**: $T(^\circ\text{C}) = \text{Raw} \times 0.02 - 273.15$

---

## 3. Raspberry Pi System Configuration

Before running on a fresh Raspberry Pi OS:

```bash
# 1. Enable SPI and I2C interfaces
sudo raspi-config
# Navigate to: Interface Options -> SPI -> Enable
# Navigate to: Interface Options -> I2C -> Enable

# 2. Verify I2C devices are detected
sudo apt-get install -y i2c-tools
i2cdetect -y 1
# Expected addresses: 0x27 (LCD), 0x53 (ADXL345), 0x5A (MLX90614)

# 3. Install required Python libraries
pip install -r requirements.txt
```

---

## 4. How to Run

### On the Raspberry Pi with Sensors:
```bash
python predict_live.py
```
- Real-time telemetry and predictions will stream to the **Pi terminal**.
- LCD displays current state and confidence percentage.
- The web server starts on `http://localhost:5000` (on the Pi) and `http://<PI_IP>:5000` (for other computers/phones on the same Wi-Fi).

### On a Laptop or PC (Simulation Mode):
```bash
python predict_live.py --simulate
```
(No hardware or sensor libraries needed! Feeds realistic data matching the trained model).
