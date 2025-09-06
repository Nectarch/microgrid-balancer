# MATLAB/Octave validation (sim)

This folder will contain MATLAB/Octave (.m) scripts that:
1) Run a DC load flow on the same 9-bus test system.
2) Apply a simple battery charge/discharge heuristic over 24 hours.
3) Export results (and optionally the network) as JSON for the web app.

Planned files:
- dc_load_flow.m        # solve DC power flow for a given network
- battery_dispatch.m    # simple hourly heuristic
- export_to_json.m      # write results/network to docs/grid.json-compatible files
