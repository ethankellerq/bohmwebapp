/**
 * BohmianMechanicsEngine
 *
 * This file contains the pure JavaScript implementation for Phase 1 of our project.
 * It calculates a particle's trajectory based on Bohmian mechanics without
 * any graphics or database dependencies.
 *
 * The core idea is to simulate a particle guided by a wave function that
 * represents the classic "double-slit" experiment. This requires us to:
 * 1. Define a wave function for two interfering Gaussian packets.
 * 2. Implement complex number arithmetic to handle the wave function's values.
 * 3. Calculate the wave function's gradient (∇Ψ).
 * 4. Use the guiding equation v = (ħ/m) * Im((∇Ψ) / Ψ) to find the particle's velocity.
 * 5. Run a loop to update the particle's position over time.
 */

const BohmianEngine = (() => {

    // --- Physical Constants (in natural units for simplicity) ---
    const H_BAR = 1; // Reduced Planck's constant
    const MASS = 1;  // Particle mass

    //================================================================
    // Part 1: Complex Number Helpers
    // The wave function Ψ is a complex-valued function. We need tools
    // to perform arithmetic (add, multiply, divide) on complex numbers.
    // A complex number is represented as an object { re: real_part, im: imaginary_part }.
    //================================================================

    const complex = (re = 0, im = 0) => ({ re, im });

    const add = (a, b) => complex(a.re + b.re, a.im + b.im);

    const multiply = (a, b) => complex(
        a.re * b.re - a.im * b.im,
        a.re * b.im + a.im * b.re
    );

    const divide = (a, b) => {
        const denominator = b.re * b.re + b.im * b.im;
        if (denominator === 0) {
            // Avoid division by zero, return a placeholder
            return complex(0, 0);
        }
        return complex(
            (a.re * b.re + a.im * b.im) / denominator,
            (a.im * b.re - a.re * b.im) / denominator
        );
    };

    //================================================================
    // Part 2: The Wave Function (Ψ)
    // This is the mathematical description of the "pilot wave".
    // We are modeling two slits by creating two Gaussian wave packets
    // and adding them together (superposition).
    //================================================================

    /**
     * Calculates the value of a single Gaussian wave packet at a point (x, y).
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @param {object} params - Parameters of the wave packet.
     * @param {number} params.centerX - The x-center of the packet.
     * @param {number} params.centerY - The y-center of the packet.
     * @param {number} params.width - The spatial width (sigma) of the packet.
     * @param {number} params.momentumX - The momentum in the x-direction.
     * @param {number} params.momentumY - The momentum in the y-direction.
     * @returns {object} A complex number representing the wave function value.
     */
    function gaussianPacket(x, y, params) {
        const { centerX, centerY, width, momentumX, momentumY } = params;
        const widthSq = width * width;

        // The magnitude part of the Gaussian
        const dx = x - centerX;
        const dy = y - centerY;
        const magnitude = Math.exp(-(dx * dx + dy * dy) / (4 * widthSq));

        // The phase part of the wave function (e^(i*theta))
        const phaseAngle = (momentumX * dx + momentumY * dy) / H_BAR;
        const phase = complex(Math.cos(phaseAngle), Math.sin(phaseAngle));

        // The full wave function value is magnitude * phase
        return multiply(complex(magnitude, 0), phase);
    }

    /**
     * Calculates the gradient (∇Ψ) of a single Gaussian wave packet.
     * The gradient is a vector [dΨ/dx, dΨ/dy].
     * @returns {object[]} An array of two complex numbers [dΨ/dx, dΨ/dy].
     */
    function gaussianPacketGradient(x, y, params) {
        const { centerX, centerY, width, momentumX, momentumY } = params;
        const widthSq = width * width;

        const psi = gaussianPacket(x, y, params);

        // Pre-calculate the terms for the derivative from the chain rule.
        // dΨ/dx = Ψ * (-(x-x0)/(2*σ²) + i*px/ħ)
        const d_dx_term = complex(-(x - centerX) / (2 * widthSq), momentumX / H_BAR);
        const d_dy_term = complex(-(y - centerY) / (2 * widthSq), momentumY / H_BAR);

        const dPsi_dx = multiply(psi, d_dx_term);
        const dPsi_dy = multiply(psi, d_dy_term);

        return [dPsi_dx, dPsi_dy];
    }

    //================================================================
    // Part 3: The Guiding Equation and Simulation Loop
    // This is where we tie everything together to calculate the trajectory.
    //================================================================

    /**
     * Runs the full Bohmian mechanics simulation.
     * @param {object} config - The configuration for the simulation.
     * @param {object} config.initialPosition - Starting {x, y} of the particle.
     * @param {object} config.slit1 - Parameters for the first Gaussian packet.
     * @param {object} config.slit2 - Parameters for the second Gaussian packet.
     * @param {number} config.dt - The time step for the simulation (e.g., 0.01).
     * @param {number} config.steps - The total number of steps to simulate.
     * @returns {object[]} An array of trajectory points [{t, x, y}, ...].
     */
    function runSimulation(config) {
        const { initialPosition, slit1, slit2, dt, steps } = config;

        let currentTime = 0;
        let currentPosition = { ...initialPosition };
        const trajectory = [{ t: currentTime, ...currentPosition }];

        for (let i = 0; i < steps; i++) {
            const x = currentPosition.x;
            const y = currentPosition.y;

            // 1. Calculate total wave function from both slits (superposition)
            const psi1 = gaussianPacket(x, y, slit1);
            const psi2 = gaussianPacket(x, y, slit2);
            const totalPsi = add(psi1, psi2);

            // 2. Calculate total gradient of the wave function
            const grad1 = gaussianPacketGradient(x, y, slit1);
            const grad2 = gaussianPacketGradient(x, y, slit2);
            const totalGradPsi = [add(grad1[0], grad2[0]), add(grad1[1], grad2[1])];

            // 3. Calculate (∇Ψ) / Ψ
            const velocityTermX = divide(totalGradPsi[0], totalPsi);
            const velocityTermY = divide(totalGradPsi[1], totalPsi);

            // 4. Calculate velocity v = (ħ/m) * Im((∇Ψ) / Ψ)
            const velocityX = (H_BAR / MASS) * velocityTermX.im;
            const velocityY = (H_BAR / MASS) * velocityTermY.im;

            // 5. Update position using Euler method: new_pos = old_pos + v * dt
            currentPosition.x += velocityX * dt;
            currentPosition.y += velocityY * dt;
            currentTime += dt;

            // 6. Store the new point in our trajectory log
            trajectory.push({ t: currentTime, x: currentPosition.x, y: currentPosition.y });
        }

        return trajectory;
    }

    // Expose the public API for the engine
    return {
        runSimulation
    };

})();

//================================================================
// Example Usage (for testing in an environment like Node.js or browser console)
// This part would be removed or adapted when integrated into the main application.
//================================================================

/*
// 1. Define the simulation parameters
const simulationConfig = {
    // Start the particle slightly to the left of center
    initialPosition: { x: -0.5, y: -5 },

    // Parameters for the two "slits" (Gaussian packets)
    // They are separated along the y-axis and have forward momentum in y.
    slit1: {
        centerX: 0,
        centerY: 1.5, // Slit 1 position
        width: 1.0,
        momentumX: 0,
        momentumY: 5  // Pushing particle "upwards"
    },
    slit2: {
        centerX: 0,
        centerY: -1.5, // Slit 2 position
        width: 1.0,
        momentumX: 0,
        momentumY: 5
    },

    // Simulation control
    dt: 0.02,     // Time step
    steps: 500    // Number of steps
};

// 2. Run the simulation
const trajectory = BohmianEngine.runSimulation(simulationConfig);

// 3. Print the first and last points to see the result
console.log("Starting point:", trajectory[0]);
console.log("Ending point:", trajectory[trajectory.length - 1]);
// In a real app, you would now pass this 'trajectory' array to a drawing function.
*/
