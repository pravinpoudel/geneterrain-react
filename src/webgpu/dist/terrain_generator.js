"use strict";
exports.__esModule = true;
var wgsl_1 = require("./wgsl");
var TerrainGenerator = /** @class */ (function () {
    function TerrainGenerator(device, width, height) {
        this.device = device;
        this.width = width;
        this.height = height;
        this.nodeDataBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.rangeBuffer = this.device.createBuffer({
            size: 2 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        var storage = "storage";
        var uniform = "uniform";
        this.computeTerrainBGLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: storage
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: uniform
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: storage
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: storage
                    }
                }
            ]
        });
        this.computeTerrainPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [this.computeTerrainBGLayout]
            }),
            compute: {
                module: device.createShaderModule({
                    code: wgsl_1.compute_terrain
                }),
                entryPoint: "main"
            }
        });
        this.normalizeTerrainBGLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: storage
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: uniform
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: storage
                    }
                }
            ]
        });
        this.normalizeTerrainPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [this.normalizeTerrainBGLayout]
            }),
            compute: {
                module: device.createShaderModule({
                    code: wgsl_1.normalize_terrain
                }),
                entryPoint: "main"
            }
        });
        // Create a buffer to store the params, output, and min/max
        this.paramsBuffer = device.createBuffer({
            size: 8 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.pixelValueBuffer = device.createBuffer({
            size: this.width * this.height * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
    }
    TerrainGenerator.prototype.computeTerrain = function (nodeDataBuffer, widthFactor, translation, globalRange, nodeLength) {
        if (nodeDataBuffer === void 0) { nodeDataBuffer = this.nodeDataBuffer; }
        if (widthFactor === void 0) { widthFactor = 1000; }
        if (translation === void 0) { translation = [0, 0, 1, 1]; }
        if (globalRange === void 0) { globalRange = null; }
        if (nodeLength === void 0) { nodeLength = 0; }
        if (nodeLength == 0) {
            return;
        }
        this.nodeDataBuffer = nodeDataBuffer;
        // Have to reset range buffer unless global range checked
        if (!globalRange) {
            this.rangeBuffer = this.device.createBuffer({
                size: 2 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
        }
        else {
            this.rangeBuffer = globalRange;
        }
        // Set up params (image width, height, node length, and width factor)
        var upload = this.device.createBuffer({
            size: 8 * 4,
            usage: GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        var mapping = upload.getMappedRange();
        new Uint32Array(mapping).set([this.width, this.height, nodeLength]);
        new Float32Array(mapping).set([
            widthFactor,
            translation[0],
            translation[1],
            translation[2],
            translation[3],
        ], 3);
        upload.unmap();
        //this.device.createQuerySet({})
        var commandEncoder = this.device.createCommandEncoder();
        //commandEncoder.writeTimestamp();
        commandEncoder.copyBufferToBuffer(upload, 0, this.paramsBuffer, 0, 8 * 4);
        // Create bind group
        var bindGroup = this.device.createBindGroup({
            layout: this.computeTerrainBGLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.nodeDataBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.paramsBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.pixelValueBuffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.rangeBuffer
                    }
                },
            ]
        });
        // Run compute terrain pass
        var pass = commandEncoder.beginComputePass();
        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.computeTerrainPipeline);
        pass.dispatch(this.width, this.height, 1);
        //commandEncoder.writeTimestamp();
        // await this.device.queue.onSubmittedWorkDone();
        // Look into submitting normalization and compute in one pass to improve speed, remove synchronizations
        // Use writetimestamp for more accurate kernel timing
        // Run normalize terrain pass
        var bindGroup = this.device.createBindGroup({
            layout: this.normalizeTerrainBGLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.pixelValueBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.paramsBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.rangeBuffer
                    }
                },
            ]
        });
        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.normalizeTerrainPipeline);
        pass.dispatch(this.width, this.height, 1);
        pass.endPass();
        this.device.queue.submit([commandEncoder.finish()]);
        // await this.device.queue.onSubmittedWorkDone();
    };
    return TerrainGenerator;
}());
exports["default"] = TerrainGenerator;

//# sourceMappingURL=terrain_generator.js.map
