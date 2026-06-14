const test = require("node:test");
const assert = require("node:assert/strict");

const {
  attachMarketingWorkflowContractValidation,
  validateMarketingWorkflowContract,
} = require("../dist/index.js");

test("marketing workflow contract rejects production runs without lead metric loop", () => {
  const validation = validateMarketingWorkflowContract({
    demand_source_id: "question-1",
    output_type: "page",
    target_page_or_task: { id: "page-1", type: "local_page" },
    report_id: "report-1",
  }, { humanReviewRequired: true });

  assert.equal(validation.production_ready, false);
  assert.deepEqual(validation.missing_fields, ["lead_metric_key"]);
});

test("marketing workflow contract accepts complete demand to lead metric chain", () => {
  const validation = validateMarketingWorkflowContract({
    contract: {
      demand_source_id: "local-query-1",
      output_type: "task",
      target_page_or_task: "growth-task-1",
      report_id: "weekly-report-1",
      lead_metric_key: "qualified_lead",
      review_required: true,
    },
  });

  assert.equal(validation.production_ready, true);
  assert.deepEqual(validation.missing_fields, []);
});

test("marketing workflow contract validation is attached to input payload", () => {
  const input = { demand_source_id: "q1" };
  const validation = validateMarketingWorkflowContract(input, {
    humanReviewRequired: true,
  });
  const attached = attachMarketingWorkflowContractValidation(input, validation);

  assert.equal(attached.contract.demand_source_id, "q1");
  assert.equal(attached.contract.review_required, true);
  assert.equal(attached.contract_validation.production_ready, false);
  assert.ok(attached.contract_validation.missing_fields.includes("output_type"));
});
