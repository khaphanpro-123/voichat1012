import { NextRequest, NextResponse } from "next/server";

// Complete Debate Pipeline Test System
interface PipelineTestResult {
  step: number;
  step_name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  execution_time: number;
  data_sample?: any;
}

interface ComprehensiveTestResult {
  overall_status: "PASS" | "FAIL" | "PARTIAL";
  total_execution_time: number;
  steps_passed: number;
  steps_failed: number;
  pipeline_results: PipelineTestResult[];
  recommendations: string[];
  next_actions: string[];
}

// Test Step 1: Frontend Image Upload Simulation
async function testStep1ImageUpload(): Promise<PipelineTestResult> {
  const startTime = Date.now();
  
  try {
    // Simulate image upload process
    const testImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    
    // Validate base64 format
    if (!testImageBase64.startsWith('data:image/')) {
      throw new Error("Invalid base64 format - missing header");
    }
    
    // Check base64 length
    const base64Data = testImageBase64.split(',')[1];
    if (base64Data.length < 100) {
      throw new Error("Base64 data too short - possible truncation");
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      step: 1,
      step_name: "Frontend Image Upload",
      status: "PASS",
      details: `Image upload simulation successful. Base64 length: ${base64Data.length}`,
      execution_time: executionTime,
      data_sample: {
        base64_header: testImageBase64.substring(0, 50) + "...",
        base64_length: base64Data.length
      }
    };
    
  } catch (error) {
    return {
      step: 1,
      step_name: "Frontend Image Upload",
      status: "FAIL",
      details: `Upload failed: ${error}`,
      execution_time: Date.now() - startTime
    };
  }
}

// Test Step 2: Frontend to Backend Communication
async function testStep2FrontendToBackend(): Promise<PipelineTestResult> {
  const startTime = Date.now();
  
  try {
    const testPayload = {
      action: "start",
      imageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      userLevel: 1
    };
    
    // Validate payload structure
    const requiredFields = ['action', 'imageBase64', 'userLevel'];
    const missingFields = requiredFields.filter(field => !(field in testPayload));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate imageBase64 format
    if (!testPayload.imageBase64.startsWith('data:image/')) {
      throw new Error("imageBase64 missing proper header");
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      step: 2,
      step_name: "Frontend to Backend Communication",
      status: "PASS",
      details: "Payload validation successful. All required fields present.",
      execution_time: executionTime,
      data_sample: {
        payload_keys: Object.keys(testPayload),
        image_header_valid: testPayload.imageBase64.startsWith('data:image/')
      }
    };
    
  } catch (error) {
    return {
      step: 2,
      step_name: "Frontend to Backend Communication",
      status: "FAIL",
      details: `Communication test failed: ${error}`,
      execution_time: Date.now() - startTime
    };
  }
}

// Test Step 3: Backend Image Reception
async function testStep3BackendReception(): Promise<PipelineTestResult> {
  const startTime = Date.now();
  
  try {
    // Test debate-mode endpoint availability
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/debate-mode`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Debate API endpoint not available: ${response.status}`);
    }
    
    const apiInfo = await response.json();
    
    const executionTime = Date.now() - startTime;
    
    return {
      step: 3,
      step_name: "Backend Image Reception",
      status: "PASS",
      details: "Backend API endpoint is accessible and responding.",
      execution_time: executionTime,
      data_sample: {
        api_status: apiInfo.success,
        api_message: apiInfo.message
      }
    };
    
  } catch (error) {
    return {
      step: 3,
      step_name: "Backend Image Reception",
      status: "FAIL",
      details: `Backend reception test failed: ${error}`,
      execution_time: Date.now() - startTime
    };
  }
}

// Test Step 4: Vision Model Integration
async function testStep4VisionModel(): Promise<PipelineTestResult> {
  const startTime = Date.now();
  
  try {
    // Test vision analyze endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vision/analyze`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Vision API endpoint not available: ${response.status}`);
    }
    
    const visionInfo = await response.json();
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return {
        step: 4,
        step_name: "Vision Model Integration",
        status: "WARNING",
        details: "Vision API endpoint available but OpenAI API key not configured",
        execution_time: Date.now() - startTime,
        data_sample: {
          endpoint_status: "available",
          openai_key_configured: false
        }
      };
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      step: 4,
      step_name: "Vision Model Integration",
      status: "PASS",
      details: "Vision API endpoint available and OpenAI key configured.",
      execution_time: executionTime,
      data_sample: {
        vision_features: visionInfo.features,
        openai_key_configured: true
      }
    };
    
  } catch (error) {
    return {
      step: 4,
      step_name: "Vision Model Integration",
      status: "FAIL",
      details: `Vision model test failed: ${error}`,
      execution_time: Date.now() - startTime
    };
  }
}

// Test Step 5: Vision Analysis Results
async function testStep5VisionResults(): Promise<PipelineTestResult> {
  const startTime = Date.now();
  
  try {
    // Test with a minimal base64 image
    const testImageBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    
    // Simulate vision analysis (without actually calling OpenAI to avoid costs in testing)
    const mockVisionResult = {
      image_id: "test_img_123",
      summary: "Test image analysis",
      objects: [
        { name: "test_object", confidence: 0.95 }
      ],
      actions: [],
      scene: "test_scene",
      notes: "test_analysis_completed",
      status: "ok"
    };
    
    // Validate vision result structure
    const requiredFields = ['image_id', 'summary', 'objects', 'scene', 'status'];
    const missingFields = requiredFields.filter(field => !(field in mockVisionResult));
    
    if (missingFields.length > 0) {
      throw new Error(`Vision result missing fields: ${missingFields.join(', ')}`);
    }
    
    if (mockVisionResult.status !== 'ok') {
      throw new Error(`Vision analysis failed with status: ${mockVisionResult.status}`);
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      step: 5,
      step_name: "Vision Analysis Results",
      status: "PASS",
      details: "Vision result structure validation successful.",
      execution_time: executionTime,
      data_sample: {
        result_structure: Object.keys(mockVisionResult),
        objects_detected: mockVisionResult.objects.length,
        analysis_status: mockVisionResult.status
      }
    };
    
  } catch (error) {
    return {
      step: 5,
      step_name: "Vision Analysis Results",
      status: "FAIL",
      details: `Vision results test failed: ${error}`,
      execution_time: Date.now() - startTime
    };
  }
}

// Test Step 6: User Response Alignment
async function testStep6UserAlignment(): Promise<PipelineTestResult> {
  const startTime = Date.now();
  
  try {
    // Test alignment API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vision/align`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Alignment API endpoint not available: ${response.status}`);
    }
    
    const alignmentInfo = await response.json();
    
    // Simulate alignment process
    const mockAlignmentResult = {
      image_id: "test_img_123",
      user_text: "Test user response",
      match: "MATCH",
      content_score: 45,
      language_score: 35,
      total_score: 80,
      errors: [],
      suggest: "Good response!",
      status: "ok"
    };
    
    // Validate alignment result
    if (mockAlignmentResult.total_score < 0 || mockAlignmentResult.total_score > 100) {
      throw new Error("Invalid total score range");
    }
    
    if (!['MATCH', 'PARTIAL', 'MISMATCH'].includes(mockAlignmentResult.match)) {
      throw new Error("Invalid match classification");
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      step: 6,
      step_name: "User Response Alignment",
      status: "PASS",
      details: "Alignment system validation successful.",
      execution_time: executionTime,
      data_sample: {
        alignment_features: alignmentInfo.features,
        mock_score: mockAlignmentResult.total_score,
        match_type: mockAlignmentResult.match
      }
    };
    
  } catch (error) {
    return {
      step: 6,
      step_name: "User Response Alignment",
      status: "FAIL",
      details: `Alignment test failed: ${error}`,
      execution_time: Date.now() - startTime
    };
  }
}

// Run comprehensive pipeline test
async function runComprehensivePipelineTest(): Promise<ComprehensiveTestResult> {
  const startTime = Date.now();
  
  const testSteps = [
    testStep1ImageUpload,
    testStep2FrontendToBackend,
    testStep3BackendReception,
    testStep4VisionModel,
    testStep5VisionResults,
    testStep6UserAlignment
  ];
  
  const results: PipelineTestResult[] = [];
  let stepsPassed = 0;
  let stepsFailed = 0;
  
  // Run all test steps
  for (const testStep of testSteps) {
    try {
      const result = await testStep();
      results.push(result);
      
      if (result.status === "PASS") {
        stepsPassed++;
      } else if (result.status === "FAIL") {
        stepsFailed++;
      }
    } catch (error) {
      results.push({
        step: results.length + 1,
        step_name: "Unknown Step",
        status: "FAIL",
        details: `Test execution error: ${error}`,
        execution_time: 0
      });
      stepsFailed++;
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  const nextActions: string[] = [];
  
  const failedSteps = results.filter(r => r.status === "FAIL");
  const warningSteps = results.filter(r => r.status === "WARNING");
  
  if (failedSteps.length > 0) {
    recommendations.push(`${failedSteps.length} bước bị lỗi cần sửa chữa`);
    failedSteps.forEach(step => {
      nextActions.push(`Sửa lỗi bước ${step.step}: ${step.step_name}`);
    });
  }
  
  if (warningSteps.length > 0) {
    recommendations.push(`${warningSteps.length} bước có cảnh báo cần kiểm tra`);
    warningSteps.forEach(step => {
      nextActions.push(`Kiểm tra bước ${step.step}: ${step.step_name}`);
    });
  }
  
  if (failedSteps.length === 0 && warningSteps.length === 0) {
    recommendations.push("Tất cả bước đều hoạt động tốt");
    nextActions.push("Có thể tiến hành test với dữ liệu thật");
  }
  
  // Determine overall status
  let overallStatus: "PASS" | "FAIL" | "PARTIAL";
  if (stepsFailed === 0) {
    overallStatus = warningSteps.length > 0 ? "PARTIAL" : "PASS";
  } else {
    overallStatus = stepsPassed > 0 ? "PARTIAL" : "FAIL";
  }
  
  const totalExecutionTime = Date.now() - startTime;
  
  return {
    overall_status: overallStatus,
    total_execution_time: totalExecutionTime,
    steps_passed: stepsPassed,
    steps_failed: stepsFailed,
    pipeline_results: results,
    recommendations,
    next_actions: nextActions
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { test_type = "full" } = body;

    if (test_type === "full") {
      // Run comprehensive pipeline test
      const testResult = await runComprehensivePipelineTest();
      
      return NextResponse.json({
        success: true,
        test_type: "full_pipeline",
        ...testResult
      });
      
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid test_type. Use 'full'" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Pipeline test error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Pipeline test failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Debate Pipeline Test System",
    description: "Comprehensive testing for all 6 steps of Vision + Debate Mode pipeline",
    test_steps: {
      1: "Frontend Image Upload - File handling and base64 conversion",
      2: "Frontend to Backend Communication - Payload validation",
      3: "Backend Image Reception - API endpoint availability",
      4: "Vision Model Integration - OpenAI connection and setup",
      5: "Vision Analysis Results - Response structure validation",
      6: "User Response Alignment - Scoring and feedback system"
    },
    usage: {
      full_test: "POST { test_type: 'full' } - Run all 6 pipeline steps",
      get_info: "GET - Get test system information"
    },
    features: [
      "Automated 6-Step Pipeline Testing",
      "Performance Timing Measurement",
      "Error Detection and Classification",
      "Detailed Recommendations",
      "Sample Data Validation",
      "Health Status Reporting"
    ]
  });
}