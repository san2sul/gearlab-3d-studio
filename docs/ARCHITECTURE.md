# GearLab Universal Machine Studio — Architecture v0.1

Status: foundational architecture contract (not a claim of implemented features)
Date: 2026-11-10

## Mission
Design mechanisms at multiple scales using parametric parts and commercial catalog parts, assemble them with explicit mechanical constraints, simulate coupled motions, validate manufacturability, and export production artifacts.

## Fundamental distinction
A rendered animation is not a dynamics simulation. Geometric feasibility, kinematics, dynamics, structural integrity, manufacturing, and physical qualification have separate validation gates. No general-purpose simulator can certify all scales or all physics.

## Canonical document model
- `Document`: schemaVersion, units, parameterDefinitions, parts, occurrences, joints, transmissions, actuators, loads, studies, manufacturing, provenance.
- `PartDefinition`: id, revision, parametric feature tree or imported B-rep reference, material, mass properties, coordinate frames, interfaces, source and license.
- `Occurrence`: unique id, partDefinitionId, parentAssemblyId, rigid transform, suppression and configuration state. Reusing a part definition must not duplicate its geometry.
- `Frame`: named right-handed Cartesian coordinate system on a part, millimetres and radians in storage, rigid transform as translation + normalized quaternion.
- `Joint`: id, type, occurrenceA/frameA, occurrenceB/frameB, limits, friction and optional compliance. Types: fixed, revolute, prismatic, cylindrical, spherical, planar, universal, screw, custom.
- `Transmission`: relationship between generalized joint coordinates (gear pair, rack-and-pinion, belt, chain, differential, lead screw), ratio, sign, phase, backlash and efficiency. Transmission is NOT a rigid joint.
- `Actuator`: source type, driven joint or transmission port, torque-speed or force-speed envelope, command signal, electrical/fluid/thermal input where applicable.
- `Load`: force, torque, gravity, contact, external boundary conditions.
- `Study`: analysis type (kinematic, dynamic, contact, structural, thermal, micro-scale), solver configuration, initial conditions, time span, tolerances, result references.
- `Manufacturing`: process, material, machine constraints, dimensional tolerances, fits, orientation, supports, BOM and export metadata.
- `CatalogPart`: standard identifier (KS/ISO/DIN/JIS/ANSI), manufacturer SKU, version, verified dimensions, interface frames, rated loads, vendor source, license and date checked.

## Non-negotiable invariants
1. Stable IDs; no implicit reliance on array positions.
2. One unit system per document; conversion only at import/export and UI boundaries.
3. Every occurrence has a transform and valid referenced definition.
4. Every joint connects two existing occurrences via named frames.
5. Fixed components must have a grounded reference; identify unconstrained degrees of freedom.
6. Solvers may not mutate authoritative part geometry.
7. CAD solids must be validated independently of STL triangulation.
8. Manufacturing export requires geometry, tolerance and assembly gates; mark unverified processes explicitly.
9. Catalog specifications carry provenance and license; do not invent product specifications.
10. All numerical solvers report residuals, tolerances and convergence status; failure is not silently converted to success.

## Example: compound motion
A motor drives a revolute input joint; a gear transmission couples it to an output revolute joint; a crank and connecting rod link the output to a prismatic slider. One generalized coordinate drives multiple parts, while constraints determine the remaining coordinates. Contacts, backlash, elasticity and load require progressively stronger solvers.

## Architecture boundaries
- `core/model`: schema, units, transforms, graph and validation; independent of rendering.
- `geometry`: parametric feature evaluation, B-rep/mesh adapters, topology.
- `assembly`: occurrence graph, joints, constraints, DOF and interference.
- `mechanisms`: reusable gear, cam, linkage, belt, screw and custom transmission definitions.
- `simulation`: kinematic and dynamics solver adapters; separate structural and multiphysics studies.
- `catalog`: standards and commercial-part import with provenance.
- `manufacturing`: STL/3MF/STEP, drawings, BOM, process and tolerance checks.
- `ui`: browser editor, timeline, motion playback, diagnostics.
Existing single-file `index.html` remains operational while these modules are introduced behind tested adapters.

## Development gates
G0 — Canonical model validation and sample compound mechanism fixtures.
G1 — Existing GearLab geometry/STL regression passes; independent slicer validation recorded separately.
G2 — 2-shaft gearbox with bearings, fasteners, removable motor/crank mount, assembly DOF and tolerance checks.
G3 — Gear + crank-slider coupled kinematic simulation with numerical residual tests.
G4 — Dynamic torque/load/contact study with explicit solver limitations.
G5 — Verified commercial parts, BOM, STEP/3MF and manufacturing workflow.
G6 — Plugin architecture and advanced multiscale analyses.

## Immediate first deliverable
Commit this contract, add a machine-readable schema and validator with test fixtures, then adapt the existing gearbox to the canonical document model without breaking the live application.
