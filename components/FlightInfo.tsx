import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronDown, ChevronUp, Plane } from "lucide-react-native";

interface FlightStop {
  airport: string;
  duration: string;
  arrivalTime: string;
  departureTime: string;
}

interface Terminal {
  terminal: string;
  gate: string;
}

interface FlightPoint extends Terminal {
  code: string;
  time: string;
}

interface SingleFlight {
  type: string;
  departure: FlightPoint;
  arrival: FlightPoint;
}

interface FlightDetails {
  outbound: SingleFlight;
  return: SingleFlight;
  airline: string;
  flightNumber: {
    outbound: string;
    return: string;
  };
  aircraft: string;
  stops: {
    outbound: FlightStop[];
    return: FlightStop[];
  };
}

interface FlightRowProps {
  flight: SingleFlight;
  direction: string;
}

const FlightInfoCard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const flightDetails: FlightDetails = {
    outbound: {
      type: "Economy",
      departure: {
        code: "ENG",
        time: "07:00",
        terminal: "T2",
        gate: "B12",
      },
      arrival: {
        code: "FPO",
        time: "08:00",
        terminal: "T1",
        gate: "A5",
      },
    },
    return: {
      type: "Economy",
      departure: {
        code: "FPO",
        time: "10:00",
        terminal: "T1",
        gate: "A7",
      },
      arrival: {
        code: "ENG",
        time: "11:00",
        terminal: "T2",
        gate: "B15",
      },
    },
    airline: "Sky Airlines",
    flightNumber: {
      outbound: "SK123",
      return: "SK124",
    },
    aircraft: "Boeing 787-9",
    stops: {
      outbound: [
        {
          airport: "PAR",
          duration: "2h",
          arrivalTime: "14:00",
          departureTime: "16:00",
        },
      ],
      return: [
        {
          airport: "PAR",
          duration: "2h",
          arrivalTime: "15:00",
          departureTime: "17:00",
        },
      ],
    },
  };

  const FlightRow: React.FC<FlightRowProps> = ({ flight, direction }) => (
    <View style={styles.flightRowContainer}>
      <Text style={styles.directionLabel}>{direction}</Text>
      <View style={styles.flightTimesContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.label}>Depart</Text>
          <Text style={styles.code}>{flight.departure.code}</Text>
          <Text style={styles.time}>{flight.departure.time}</Text>
        </View>

        <View style={styles.flightPathContainer}>
          <View style={styles.flightPath} />
          <Plane style={styles.planeIcon} color="#2563eb" size={24} />
        </View>

        <View style={styles.timeBlock}>
          <Text style={styles.label}>Arrival</Text>
          <Text style={styles.code}>{flight.arrival.code}</Text>
          <View style={styles.arrivalTimeContainer}>
            <Text style={styles.time}>{flight.arrival.time}</Text>
            <Text style={styles.nextDay}>{" (next day)"}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text className="text-2xl font-rubik-extraBold">Flight Info</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{flightDetails.outbound.type}</Text>
      </View>

      <FlightRow flight={flightDetails.outbound} direction="Outbound" />
      <View style={styles.divider} />
      <FlightRow flight={flightDetails.return} direction="Return" />

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.expandButtonText}>See Full Flight Details</Text>
        {isExpanded ? (
          <ChevronUp color="#1ABC9C" size={20} />
        ) : (
          <ChevronDown color="#1ABC9C" size={20} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Airline</Text>
              <Text style={styles.detailValue}>{flightDetails.airline}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Outbound Flight</Text>
              <Text style={styles.detailValue}>
                {flightDetails.flightNumber.outbound}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Return Flight</Text>
              <Text style={styles.detailValue}>
                {flightDetails.flightNumber.return}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Aircraft</Text>
              <Text style={styles.detailValue}>{flightDetails.aircraft}</Text>
            </View>
          </View>

          {/* Outbound Stops */}
          {flightDetails.stops.outbound.length > 0 && (
            <View style={styles.stopsContainer}>
              <Text style={styles.stopsHeader}>Outbound Layover</Text>
              {flightDetails.stops.outbound.map((stop, index) => (
                <View key={`outbound-${index}`} style={styles.stopCard}>
                  <View style={styles.stopDetails}>
                    <View>
                      <Text style={styles.stopAirport}>{stop.airport}</Text>
                      <Text style={styles.stopDuration}>
                        Duration: {stop.duration}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.stopTime}>
                        Arrival: {stop.arrivalTime}
                      </Text>
                      <Text style={styles.stopTime}>
                        Departure: {stop.departureTime}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Return Stops */}
          {flightDetails.stops.return.length > 0 && (
            <View style={styles.stopsContainer}>
              <Text style={styles.stopsHeader}>Return Layover</Text>
              {flightDetails.stops.return.map((stop, index) => (
                <View key={`return-${index}`} style={styles.stopCard}>
                  <View style={styles.stopDetails}>
                    <View>
                      <Text style={styles.stopAirport}>{stop.airport}</Text>
                      <Text style={styles.stopDuration}>
                        Duration: {stop.duration}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.stopTime}>
                        Arrival: {stop.arrivalTime}
                      </Text>
                      <Text style={styles.stopTime}>
                        Departure: {stop.departureTime}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.terminalContainer}>
            <View style={styles.terminalColumn}>
              <Text style={styles.terminalHeader}>Outbound</Text>
              <Text style={styles.terminalInfo}>
                Departure Terminal: {flightDetails.outbound.departure.terminal}
              </Text>
              <Text style={styles.terminalInfo}>
                Departure Gate: {flightDetails.outbound.departure.gate}
              </Text>
              <Text style={styles.terminalInfo}>
                Arrival Terminal: {flightDetails.outbound.arrival.terminal}
              </Text>
              <Text style={styles.terminalInfo}>
                Arrival Gate: {flightDetails.outbound.arrival.gate}
              </Text>
            </View>
            <View style={styles.terminalColumn}>
              <Text style={styles.terminalHeader}>Return</Text>
              <Text style={styles.terminalInfo}>
                Departure Terminal: {flightDetails.return.departure.terminal}
              </Text>
              <Text style={styles.terminalInfo}>
                Departure Gate: {flightDetails.return.departure.gate}
              </Text>
              <Text style={styles.terminalInfo}>
                Arrival Terminal: {flightDetails.return.arrival.terminal}
              </Text>
              <Text style={styles.terminalInfo}>
                Arrival Gate: {flightDetails.return.arrival.gate}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    // margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  badgeText: {
    color: "#065f46",
    fontSize: 14,
    fontWeight: "500",
  },
  flightRowContainer: {
    marginVertical: 8,
  },
  directionLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  flightTimesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeBlock: {
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4b5563",
  },
  code: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  time: {
    fontSize: 16,
    color: "#4b5563",
  },
  arrivalTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextDay: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  flightPathContainer: {
    flex: 1,
    position: "relative",
    height: 2,
    marginHorizontal: 16,
  },
  flightPath: {
    backgroundColor: "#e5e7eb",
    height: 2,
    width: "100%",
  },
  planeIcon: {
    position: "absolute",
    top: -11,
    left: "45%",
    color: "#1ABC9C",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 16,
  },
  expandButtonText: {
    color: "#1ABC9C",
    marginRight: 4,
    fontSize: 14,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  detailItem: {
    width: "50%",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  stopsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
    marginBottom: 16,
  },
  stopsHeader: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  stopCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  stopDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stopAirport: {
    fontSize: 14,
    fontWeight: "500",
  },
  stopDuration: {
    fontSize: 12,
    color: "#6b7280",
  },
  stopTime: {
    fontSize: 12,
    textAlign: "right",
  },
  terminalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
  },
  terminalColumn: {
    flex: 1,
  },
  terminalHeader: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  terminalInfo: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 4,
  },
});

export default FlightInfoCard;
