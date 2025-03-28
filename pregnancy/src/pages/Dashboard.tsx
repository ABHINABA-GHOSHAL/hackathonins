import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { calculateGestationalAge, calculatePregnancyProgress, daysUntilDueDate, getTrimester } from "@/lib/utils";
import Layout from "@/components/Layout";
import ProgressMetrics from "@/components/ProgressMetrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, ArrowUpRight, ArrowDownRight, FileText, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf"; // Import jsPDF for PDF generation

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isRegistered, 
    patientData, 
    questionnaireCompleted, 
    medicalReports 
  } = useApp();

  
  if (!patientData.lmp) {
    return (
      <Layout>
        <div className="container mx-auto p-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-md">
            <p className="text-yellow-700">
              There seems to be an issue with your registration data. Please update your information.
            </p>
            <Link to="/register" className="mt-4 inline-block">
              <Button variant="outline" className="mt-2">
                Update Registration
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const lmpDate = new Date(patientData.lmp);
  const dueDate = new Date(patientData.dueDate || "");
  const remainingDays = daysUntilDueDate(dueDate);
  const { weeks, days } = calculateGestationalAge(lmpDate);
  const trimester = getTrimester(lmpDate);
  const progress = calculatePregnancyProgress(lmpDate);

  // Process risk factors from all reports
  const allRiskFactors = medicalReports.flatMap(report => 
    report.analysisResults?.risk_factors || []
  );

  // Count test results by risk level
  const testResultCounts = {
    normal: medicalReports.reduce((sum, report) => sum + (report.analysisResults?.normal_results || 0), 0),
    borderline: medicalReports.reduce((sum, report) => sum + (report.analysisResults?.borderline_results || 0), 0),
    high_risk: medicalReports.reduce((sum, report) => sum + (report.analysisResults?.high_risk_results || 0), 0),
    unknown: medicalReports.reduce((sum, report) => sum + (report.analysisResults?.unknown_results || 0), 0),
  };

  // Direction indicator for test results
  const DirectionIndicator = ({ direction }: { direction: string }) => {
    switch (direction) {
      case "high":
        return <ArrowUpRight className="text-red-500" size={16} />;
      case "low":
        return <ArrowDownRight className="text-blue-500" size={16} />;
      default:
        return null;
    }
  };

  // Badge for risk levels
  const RiskBadge = ({ riskLevel }: { riskLevel: string }) => {
    switch (riskLevel) {
      case "high_risk":
        return (
          <Badge variant="destructive" className="flex gap-1 items-center">
            <AlertTriangle size={12} />
            High Risk
          </Badge>
        );
      case "borderline":
        return (
          <Badge variant="default" className="flex gap-1 items-center bg-yellow-500">
            <Info size={12} />
            Borderline
          </Badge>
        );
      case "normal":
        return (
          <Badge variant="outline" className="flex gap-1 items-center text-green-600 border-green-600">
            <CheckCircle size={12} />
            Normal
          </Badge>
        );
      default:
        return null;
    }
  };

  // Function to generate patient summary data
  const generatePatientSummary = () => {
    const bmi = patientData.height && patientData.currentWeight
      ? (patientData.currentWeight / Math.pow(patientData.height / 100, 2)).toFixed(1)
      : null;

    const healthSummary = {
      bmi,
      prePregnancyWeight: patientData.preWeight,
      currentWeight: patientData.currentWeight,
      height: patientData.height,
    };

    // Add all test results from medical reports
    const allTestResults = medicalReports.flatMap(report => 
      (report.analysisResults?.all_results || []).map(result => ({
        test_name: result.test_name,
        result_value: result.result_value,
        result_unit: result.result_unit,
        reference_range: result.reference_range,
        risk_level: result.risk_level,
        direction: result.direction,
        reportDate: report.date,
        reportId: report.id,
      }))
    );

    const riskFactors = allRiskFactors.map(risk => ({
      test_name: risk.test_name,
      result_value: risk.result_value,
      result_unit: risk.result_unit,
      reference_range: risk.reference_range,
      risk_level: risk.risk_level,
      direction: risk.direction,
    }));

    const testAnalysis = {
      normal: testResultCounts.normal,
      borderline: testResultCounts.borderline,
      high_risk: testResultCounts.high_risk,
      unknown: testResultCounts.unknown,
    };

    const currentTrimester = getTrimester(new Date(patientData.lmp));

    return {
      patientId: patientData.id,
      healthSummary,
      allTestResults,
      riskFactors,
      testAnalysis,
      currentTrimester,
      generatedAt: new Date().toISOString(),
    };
  };

  // Function to download the summary as a JSON file
  const downloadSummaryJSON = () => {
    const summary = generatePatientSummary();
    const jsonString = JSON.stringify(summary, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient_${patientData.id}_summary.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Hardcoded report string for testing
  const hardcodedReport = `
Response:
 
1. Patient Overview:
Name: Yashavi Patel
Age: 35 years
Gender: Female
Due Date: 2025-03-27
Last Menstrual Period: 2024-06-15
Current Week: 40
Blood Group: A+
Pre-existing Conditions: Diabetes, Thyroid Disorder
Height: 156 cm
Current Weight: 64 kg
Pre-pregnancy Weight: 60 kg

2. Health Assessment:
- The patient is 35 years old and is currently 40 weeks pregnant, with a due date of 2025-03-27.
- She has a history of Diabetes and a Thyroid Disorder.
- Her blood group is A+.
- Her height is 156 cm, and her current weight is 64 kg, which is an increase of 4 kg from her pre-pregnancy weight of 60 kg.
- She is in her first pregnancy.
- She exercises occasionally (1-2 times/week).
- Her emotional wellbeing is mostly positive.
- She takes prenatal vitamins regularly.

3. Potential Risk Indicators:
- The patient's packed cell volume (PCV) is 57.5 %,, which is borderline (range: 40.0 - 50.0).
- Her hemoglobin level is 12.5 g/dL, which is also borderline (Range: 13.0 - 17.0).
- Her GLUCOSE fasting level is 315.0 mg/dL, which is high-risk (Range: 70.0 - 100.0).
- Her Index Value is 11.0, which is high-risk (Range: NaN - 1.0).
- Her TSH level is 10.1 mU/L, which is high-risk (Range: 0.4 - 4.0).

4. Recommendations:
- The patient should be closely monitored for anemia and gestational diabetes.
- She should be referred to a specialist for her diabetes and thyroid disorder.
- She should be advised to maintain a balanced diet, focusing on nutrient-rich foods and limiting high-risk foods such as sweets and fats.
- She should be encouraged to engage in regular, low-impact exercise, such as walking.
- She should be advised to take her prenatal vitamins as prescribed.

5. Next Steps:
- Schedule follow-up appointments with the obstetrician and specialists as necessary.
- Arrange for additional testing and monitoring as recommended by the healthcare team.
- Provide the patient with educational materials on pregnancy, diabetes, and thyroid disorders.
- Encourage the patient to attend prenatal education classes and support groups.
- Offer the patient counseling and emotional support throughout her pregnancy.
  `.trim();

  // Function to generate and download the detailed report as a PDF using the hardcoded string
  const handleDownloadReport = () => {
    try {
      // Use the hardcoded report string
      const report = hardcodedReport || 'No report content available';

      // Generate PDF using jsPDF
      const doc = new jsPDF();
      let y = 10; // Starting y-position

      // Add the consistent heading "Maternal Health Report"
      doc.setFontSize(20); // Slightly larger for the main heading
      doc.text("Maternal Health Report", 10, y);
      y += 15; // Add space after the heading

      // Process the report content with reduced font sizes
      const lines = report.split('\n');
      lines.forEach(line => {
        if (line.startsWith('Response:')) {
          // Skip the "Response:" line as it's not needed in the PDF
          return;
        } else if (line.match(/^\d+\.\s/)) {
          // Section headings (e.g., "1. Patient Overview:")
          doc.setFontSize(14); // Reduced from 18
          doc.text(line, 10, y);
        } else if (line.startsWith('- ')) {
          // List items
          doc.setFontSize(9); // Reduced from 12
          doc.text(`• ${line.substring(2)}`, 15, y);
        } else {
          // Regular text
          doc.setFontSize(9); // Reduced from 12
          doc.text(line, 10, y);
        }
        y += 8; // Reduced line spacing from 10 to 8 to fit more content
        if (y > 280) { // Check if we need a new page
          doc.addPage();
          y = 10;
        }
      });

      // Download the PDF
      doc.save(`detailed_patient_report_${patientData.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Failed to download the detailed report. Please try again later.');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Pregnancy Health Dashboard</h1>
        
        <ProgressMetrics />
        
        <div className="mt-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Pregnancy Progress</h2>
          <p className="text-sm text-gray-500 mb-2">Currently {progress}% through your pregnancy</p>
          <Progress value={progress} className="h-2" />
        </div>

        {medicalReports.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Medical Reports Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="outline" className="flex gap-1 text-green-600 border-green-600">
                  <CheckCircle size={12} />
                  {testResultCounts.normal} Normal
                </Badge>
                {testResultCounts.borderline > 0 && (
                  <Badge variant="default" className="flex gap-1 bg-yellow-500">
                    <Info size={12} />
                    {testResultCounts.borderline} Borderline
                  </Badge>
                )}
                {testResultCounts.high_risk > 0 && (
                  <Badge variant="destructive" className="flex gap-1">
                    <AlertTriangle size={12} />
                    {testResultCounts.high_risk} High Risk
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-gray-500 mb-2">
                You have uploaded {medicalReports.length} medical reports.
              </div>
              
              <div className="flex gap-2 mt-2">
                <Link to="/view-reports">
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    View All Reports
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleDownloadReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Detailed Patient Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="health" className="mt-8">
          <TabsList className="mb-6">
            <TabsTrigger value="health">Health Summary</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
            <TabsTrigger value="tests">Test Results Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="health" className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-medium mb-4">Health Indicators</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium mb-1">Body Mass Index (BMI)</h4>
                  {patientData.height && patientData.currentWeight ? (
                    <>
                      <p className="mb-2">
                        Current BMI: <span className="font-semibold text-green-600">
                          {(patientData.currentWeight / Math.pow(patientData.height / 100, 2)).toFixed(1)}
                        </span> - Normal
                      </p>
                      <p className="text-sm text-gray-500">Pre-pregnancy weight: {patientData.preWeight} kg</p>
                      <p className="text-sm text-gray-500">Current weight: {patientData.currentWeight} kg</p>
                      <p className="text-sm text-gray-500">Height: {patientData.height} cm</p>
                    </>
                  ) : (
                    <p className="text-yellow-600">Please complete your health profile to see BMI calculations.</p>
                  )}
                </div>
                
                {medicalReports.length === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-yellow-700">No medical reports have been uploaded yet.</p>
                    <p className="text-sm mt-2">Please upload your medical reports to see health indicators.</p>
                    <Link to="/upload-reports">
                      <Button variant="outline" size="sm" className="mt-2">
                        Upload Reports
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="risk" className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-medium mb-4">Pregnancy Risk Assessment</h3>
              
              {!questionnaireCompleted || medicalReports.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-md">
                  <p className="text-yellow-700">Insufficient data for risk assessment.</p>
                  <p className="text-sm mt-2">
                    Please upload medical reports and complete the health questionnaire for risk assessment.
                  </p>
                  <div className="flex gap-2 mt-2">
                    {!questionnaireCompleted && (
                      <Link to="/questionnaire">
                        <Button variant="outline" size="sm">
                          Complete Questionnaire
                        </Button>
                      </Link>
                    )}
                    {medicalReports.length === 0 && (
                      <Link to="/upload-reports">
                        <Button variant="outline" size="sm">
                          Upload Reports
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : allRiskFactors.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-md font-medium">Identified Risk Factors</h4>
                  <div className="space-y-2">
                    {allRiskFactors.slice(0, 5).map((risk, idx) => (
                      <div key={idx} className="p-2 rounded bg-gray-50 text-sm flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <DirectionIndicator direction={risk.direction} />
                          <span className="font-medium">{risk.test_name}:</span> 
                          <span>{risk.result_value} {risk.result_unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Ref: {risk.reference_range}</span>
                          <RiskBadge riskLevel={risk.risk_level} />
                        </div>
                      </div>
                    ))}
                    
                    {allRiskFactors.length > 5 && (
                      <Link to="/view-reports" className="text-sm text-materna-600 block mt-2">
                        View all {allRiskFactors.length} risk factors
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-green-600">No significant risk factors identified from your test results.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="tests" className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-medium mb-4">Test Results Analysis</h3>
              
              {medicalReports.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-md">
                  <p className="text-yellow-700">No test result risk factors have been identified yet.</p>
                  <p className="text-sm mt-2">
                    This section will display any abnormal test results after you upload and analyze your medical reports.
                  </p>
                  <Link to="/upload-reports">
                    <Button variant="outline" size="sm" className="mt-2">
                      Upload Reports
                    </Button>
                  </Link>
                </div>
              ) : testResultCounts.high_risk === 0 && testResultCounts.borderline === 0 ? (
                <p className="text-green-600">All test results are within normal range.</p>
              ) : (
                <div>
                  <p className="mb-4">
                    Your reports show {testResultCounts.high_risk + testResultCounts.borderline} abnormal test results
                    that may require attention.
                  </p>
                  <Link to="/view-reports">
                    <Button variant="outline" size="sm">
                      View Detailed Analysis
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-medium mb-4">Recommendations and Next Steps</h3>
              
              {testResultCounts.high_risk > 0 && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6 rounded-md">
                  <p className="text-red-700 font-medium">
                    Alert: High-risk factors have been detected in your test reports. 
                    It is strongly recommended to consult your doctor as soon as possible.
                  </p>
                </div>
              )}
              
              {trimester === 3 && (
                <div>
                  <h4 className="text-md font-medium mb-3">3rd Trimester Essentials</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Prepare for labor and delivery (birth plan, hospital bag)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Monitor fetal movement daily</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Complete your baby preparations (car seat, nursery)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Consider breastfeeding education if planning to breastfeed</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Discuss labor signs and when to go to the hospital with your provider</span>
                    </li>
                  </ul>
                </div>
              )}
              
              {trimester === 2 && (
                <div>
                  <h4 className="text-md font-medium mb-3">2nd Trimester Recommendations</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Schedule your 20-week anatomy scan</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Begin prenatal education classes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Continue taking prenatal vitamins</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Stay physically active with pregnancy-safe exercises</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Begin planning for maternity leave and childcare</span>
                    </li>
                  </ul>
                </div>
              )}
              
              {trimester === 1 && (
                <div>
                  <h4 className="text-md font-medium mb-3">1st Trimester Recommendations</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Schedule your first prenatal appointment</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Begin taking prenatal vitamins with folic acid</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Avoid alcohol, smoking, and limit caffeine</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Stay hydrated and get plenty of rest</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-materna-500 mr-2">•</span>
                      <span>Consider first trimester screening tests</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Button to download the JSON summary */}
        <div className="mt-8">
          <Button onClick={downloadSummaryJSON} className="w-full md:w-auto">
            Download Summary JSON
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;