# Battleship finite-catalogue POMDP

## GNNSection
ActInfPOMDP

## GNNVersionAndFlags
GNN v1

## ModelName
BattleshipFiniteCatalogue

## ModelAnnotation
Static, legal, non-overlapping fleets on a square board. Hidden state s is a complete
fleet layout in a reproducibly sampled finite catalogue. The environment draws its
hidden layout from this same prior support. A shot u queries one unvisited cell.
Only binary hit/miss observations enter inference; sunk labels are game UI metadata.
The browser implements this explicit sparse procedural likelihood, not a dense tensor.
Inference is exact conditional on the finite catalogue, which is not the full fleet space.

## StateSpaceBlock
s[4096,type=float]
o[2,type=int]
u[100,type=int]
A[2,4096,100,type=float]
B[4096,4096,type=float]
C[2,type=float]
D[4096,type=float]
E[100,type=float]
G[100,type=float]
q_pi[100,type=float]

## Connections
s>A
u>A
A>o
D>s
s>B
C>G
E>q_pi
G>q_pi
q_pi>u

## InitialParameterization
board_size=10
ship_lengths=[5,4,3,3,2]
catalogue_size=4096
epistemic_weight=1.0
hit_preference=2.5
policy_precision=8.0
sensor_noise=0.02
habit_strength=0.0
seed=1943

## Equations
A(o=hit|s,u) = sensor_noise + (1-2*sensor_noise)*occupied(s,u)
B(s_next|s) = identity(s_next,s)
D(s) = 1/catalogue_size
C = log_softmax([0,hit_preference])
E(u) = softmax(habit_strength*centre_score(u))
q(s|h) = normalize(D(s)*product_t A(o_t|s,u_t))
information_gain(u) = H[q(o|u)] - H_binary(sensor_noise)
risk(u) = -sum_o q(o|u)*C(o)
G(u) = risk(u) - epistemic_weight*information_gain(u)
q_pi(u) = softmax(log(E(u))-policy_precision*G(u))
F_t = KL(q_t||q_previous)-E_q_t[log A(o_t|s,u_t)]

## Time
Dynamic
DiscreteTime
ModelTimeHorizon=1

## ActInfOntologyAnnotation
s=HiddenState
o=Observation
u=Action
A=LikelihoodMatrix
B=TransitionMatrix
C=LogPreferenceVector
D=PriorOverHiddenStates
E=Habit
G=ExpectedFreeEnergy
q_pi=PolicyPosterior

## Footer
Procedural finite-state Battleship model. All entropy, KL and energy quantities use nats.
Controls alter subjective inference and policy; game outcomes remain deterministic.
