# CARTS Research - Reproducibility Package

## Overview

This repository contains the complete implementation and reproducibility package for:

**"CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning"**

Published at EMNLP 2026

## Quick Start

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- 16GB RAM (recommended)
- 10GB free disk space

### Installation
```bash
# Clone repository
git clone https://github.com/anonymous/carts-research.git
cd carts-research

# Install dependencies
npm install

# Run tests to verify installation
npm test

# Run demo
npm run demo
```

### Docker Quick Start
```bash
# Build container
docker build -t carts-research .

# Run demo in container
docker run -it carts-research npm run demo
```

## Repository Structure

```
carts-research/
├── lib/                          # Core algorithm implementations
│   ├── spacedRepetition.ts       # DART algorithm
│   ├── carts-scheduler.ts        # CARTS deep RL framework
│   ├── baseline-schedulers.ts    # SM-2, HLR, KARL, LECTOR
│   ├── context-transfer-metric.ts # LLM-as-a-Judge evaluation
│   └── statistical-analysis.ts   # Statistical analysis pipeline
├── scripts/                      # Experiment execution scripts
│   ├── run-longitudinal-study-demo.ts
│   ├── run-statistical-analysis.ts
│   └── generate-paper-*.ts
├── __tests__/                    # Comprehensive test suite
├── demo/                         # Interactive demonstrations
│   ├── carts-demo.ipynb         # Jupyter notebook demo
│   ├── mock-data/               # Sample datasets
│   └── examples/                # Usage examples
├── results/                      # Generated results and figures
├── paper/                        # Paper source files
└── docs/                         # Documentation
```

## Algorithm Implementations

### DART (Difficulty-Aware Retrieval-Type)
- **File**: `lib/spacedRepetition.ts`
- **Description**: Extension of Half-Life Regression with adaptive difficulty
- **Key Features**: Zone of Proximal Development, scaffolding
- **Usage**: See `demo/dart-example.ts`

### CARTS (Contextual Adaptive Retrieval-Type Scheduler)  
- **File**: `lib/carts-scheduler.ts`
- **Description**: Deep RL framework with joint optimization
- **Key Features**: Transformer encoding, PPO optimization, multi-objective rewards
- **Usage**: See `demo/carts-example.ts`

### Baseline Algorithms
- **File**: `lib/baseline-schedulers.ts`
- **Implementations**: SM-2, HLR, KARL, LECTOR
- **Validation**: Verified against published specifications
- **Usage**: See `demo/baseline-comparison.ts`

## Reproducing Results

### Full Experiment Reproduction
```bash
# Run complete statistical analysis (requires results data)
npm run reproduce:full

# Generate all paper figures and tables
npm run generate:paper

# Run algorithm comparison demo
npm run demo:comparison
```

### Individual Components
```bash
# Test DART algorithm
npm run test:dart

# Test CARTS framework  
npm run test:carts

# Test context transfer evaluation
npm run test:context-transfer

# Run statistical analysis
npm run analyze:statistics
```

## Hardware Requirements

### Minimum Requirements
- **CPU**: 4 cores, 2.0 GHz
- **Memory**: 8GB RAM
- **Storage**: 5GB free space
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### Recommended Requirements
- **CPU**: 8 cores, 3.0 GHz
- **Memory**: 16GB RAM
- **Storage**: 10GB free space
- **GPU**: Optional, CUDA-compatible for faster training

### Cloud Deployment
- **AWS**: t3.xlarge or larger
- **Google Cloud**: n1-standard-4 or larger  
- **Azure**: Standard_D4s_v3 or larger

## Data Requirements

### Mock Data (Included)
- **Participants**: 50 simulated learners
- **Vocabulary**: 25 words per participant
- **Duration**: 2 weeks of interactions
- **Purpose**: Algorithm testing and demonstration

### Full Dataset (Available on Request)
- **Participants**: 200 real learners
- **Vocabulary**: 50 words per participant  
- **Duration**: 8 weeks of interactions
- **Access**: Contact authors with data use agreement

## Installation Guide

### Step 1: Environment Setup
```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be 18.x.x
npm --version   # Should be 9.x.x
```

### Step 2: Repository Setup
```bash
# Clone and enter directory
git clone https://github.com/anonymous/carts-research.git
cd carts-research

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Step 3: Verification
```bash
# Run test suite
npm test

# Expected output: All tests passing (200+ tests)
# If any tests fail, check troubleshooting section
```

### Step 4: Demo Execution
```bash
# Run interactive demo
npm run demo

# Expected output: Algorithm comparison results
# Runtime: ~5 minutes on recommended hardware
```

## Troubleshooting

### Common Issues

**Issue**: `npm install` fails with permission errors
**Solution**: 
```bash
# Use npm with --unsafe-perm flag
npm install --unsafe-perm

# Or configure npm properly
npm config set unsafe-perm true
```

**Issue**: TypeScript compilation errors
**Solution**:
```bash
# Clean and rebuild
npm run clean
npm run build

# Check TypeScript version
npx tsc --version  # Should be 5.x.x
```

**Issue**: Memory errors during execution
**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm run demo
```

**Issue**: GPU not detected (optional)
**Solution**:
```bash
# Check CUDA installation
nvidia-smi

# Install CUDA toolkit if needed
# Follow: https://developer.nvidia.com/cuda-toolkit
```

### Performance Optimization

**Slow execution**: 
- Reduce dataset size in demo configuration
- Use `npm run demo:fast` for quick validation
- Enable parallel processing: `export UV_THREADPOOL_SIZE=8`

**High memory usage**:
- Monitor with: `npm run monitor`
- Reduce batch sizes in configuration files
- Use streaming processing for large datasets

### Getting Help

1. **Check Documentation**: `docs/` directory
2. **Search Issues**: GitHub issue tracker  
3. **Contact Authors**: See CONTACT.md
4. **Community**: Join our Discord server (link in README)

## Testing

### Test Suite Overview
- **Unit Tests**: 150+ tests for individual components
- **Integration Tests**: 50+ tests for workflows
- **Performance Tests**: Benchmarking and profiling
- **Regression Tests**: Validation against known results

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:performance

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

### Test Configuration
- **Framework**: Jest with TypeScript support
- **Coverage Target**: >95% line coverage
- **Timeout**: 30 seconds per test
- **Parallel**: Up to 4 workers

## Contributing

We welcome contributions to improve reproducibility and extend the research:

### Development Setup
```bash
# Fork repository and clone
git clone https://github.com/yourusername/carts-research.git

# Create development branch
git checkout -b feature/your-feature

# Install development dependencies
npm install --include=dev

# Run in development mode
npm run dev
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Prettier
- **Testing**: Jest with >95% coverage
- **Documentation**: JSDoc for all public APIs

### Submission Process
1. Create feature branch
2. Add tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit pull request with description

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Citation

If you use this code in your research, please cite:

```bibtex
@inproceedings{anonymous2026carts,
  title={CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning},
  author={Anonymous Authors},
  booktitle={Proceedings of EMNLP 2026},
  year={2026}
}
```

## Acknowledgments

- OpenAI for GPT-4 API access for LLM evaluation
- Participants in the longitudinal study
- Anonymous reviewers for constructive feedback
- Open source community for foundational tools

## Contact

For questions about reproduction or extensions:
- **Email**: anonymous@research.org
- **GitHub**: Create an issue in this repository
- **Website**: https://anonymous-research.org/carts

---

**Last Updated**: 2026-05-30
**Version**: 1.0.0
**Status**: Production Ready
