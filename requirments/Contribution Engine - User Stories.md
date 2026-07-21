# **Dynamic Contribution Engine**

## **User Stories Document**

**Version:** 1.0 (Draft)

**1\. Introduction**

## **Purpose**

The Dynamic Contribution Engine enables organisers to collect payments from multiple participants while supporting changes to the booking throughout its lifecycle.

Unlike traditional split-payment systems, the Contribution Engine allows organisers to manage contribution plans, recalculate outstanding balances, and choose how future contributions should be collected without affecting payments that have already been completed.

The engine supports three contribution methods:

* Equal Split  
* Open Contribution  
* Hybrid Contribution

# **EPIC 1 – Contribution Plan Management**

## **1.1 Create Contribution Plan**

### **Narrative**

As an organiser, I want to create a contribution plan for my booking so that I can collect payments from multiple participants.

### **Acceptance Criteria**

* The organiser can create a contribution plan for an eligible booking.  
* The organiser can choose the contribution mode.  
* The system creates the initial Contribution Plan (Version 1).  
* The booking displays contribution progress.

## **1.2 Select Contribution Mode**

### **Narrative**

As an organiser, I want to choose how contributions will be collected so that the payment experience matches my group's needs.

### **Acceptance Criteria**

The organiser can select:

* Equal Split  
* Open Contribution  
* Hybrid

The selected mode is saved as part of the Contribution Plan.

# **EPIC 2 – Equal Split Contributions**

## **2.1 Add Participants**

### **Narrative**

As an organiser, I want to manually add participants so that I can track who has and has not paid.

### **Acceptance Criteria**

* The organiser can add participants manually.  
* Participant information includes:  
  * Name  
  * Email  
  * Phone Number (optional)  
* Duplicate participants are prevented.  
* Participants are stored with a Pending status.

## **2.2 Equal Distribution**

### **Narrative**

As an organiser, I want the system to divide the outstanding booking balance equally so that each participant has the same contribution amount.

### **Acceptance Criteria**

* The system calculates equal contributions.  
* Any rounding differences are handled automatically.  
* The total contributions always equal the booking value.

## **2.3 Individual Contribution Links**

### **Narrative**

As an organiser, I want each participant to receive a unique contribution link so that payments can be individually tracked.

### **Acceptance Criteria**

* A unique secure link is generated for every participant.  
* Links reference the current Contribution Plan version.  
* Previous links become invalid when a new plan is published.

## **2.4 Track Participant Status**

### **Narrative**

As an organiser, I want to monitor each participant's payment status so that I know who still needs to contribute.

### **Acceptance Criteria**

Participant statuses include:

* Pending  
* Paid  
* Cancelled  
* Expired

The organiser can filter participants by status.

# **EPIC 3 – Open Contribution**

## **3.1 Generate Open Contribution Link**

### **Narrative**

As an organiser, I want to generate a public contribution link so that anyone can contribute towards the booking.

### **Acceptance Criteria**

* One contribution link is generated.  
* No participant records are created before payment.  
* Multiple contributors can use the same link.  
* Remaining balance updates after every payment.

## **3.2 Record Open Contributions**

### **Narrative**

As the system, I want to record every contribution received through the public link so that a complete payment history is maintained.

### **Acceptance Criteria**

* Every payment creates a contributor record.  
* Contributor information is stored for audit purposes.  
* The remaining balance is updated automatically.

# **EPIC 4 – Hybrid Contributions**

## **4.1 Combine Equal Split and Open Contribution**

### **Narrative**

As an organiser, I want to use both Equal Split and Open Contribution together so that I can track selected participants while still accepting additional contributions.

### **Acceptance Criteria**

* Equal Split and Open Contribution can exist within the same booking.  
* Both payment methods update the same outstanding balance.  
* Payment progress is consolidated.

# **EPIC 5 – Contribution Recalculation**

## **5.1 Recalculate Contributions**

### **Narrative**

As an organiser, I want to recalculate outstanding contributions after my booking changes so that contribution requests remain accurate.

### **Acceptance Criteria**

Recalculation can be initiated when:

* Booking price changes  
* Participants are added  
* Participants are removed  
* Vehicle changes  
* Route changes

Completed payments remain unchanged.

## **5.2 Equal Redistribution**

### **Narrative**

As an organiser, I want to redistribute the remaining balance equally across unpaid participants.

### **Acceptance Criteria**

* Only unpaid balances are redistributed.  
* Paid contributions remain unchanged.  
* New contribution links are generated.

## **5.3 Manual Redistribution**

### **Narrative**

As an organiser, I want to manually assign contribution amounts so that I can decide who pays the remaining balance.

### **Acceptance Criteria**

* The organiser can enter custom amounts.  
* Validation ensures allocated amounts equal the outstanding balance.  
* The contribution plan can be published after validation.

## **5.4 Publish New Contribution Plan**

### **Narrative**

As an organiser, I want to publish a revised contribution plan so that participants receive updated payment requests.

### **Acceptance Criteria**

Publishing a plan:

* Creates a new Contribution Plan version.  
* Invalidates previous contribution links.  
* Generates new links.  
* Preserves previous payment history.

# **EPIC 6 – Payment Processing**

## **6.1 Contribution Page**

### **Narrative**

As a participant, I want to review my contribution before making payment.

### **Acceptance Criteria**

The page displays:

* Booking summary  
* Contribution amount  
* Outstanding balance  
* Payment button

## **6.2 Stripe Checkout**

### **Narrative**

As a participant, I want to pay securely using Stripe.

### **Acceptance Criteria**

* Users are redirected to Stripe Checkout.  
* Payments are processed securely.  
* Payment status is synchronised with the platform.

## **6.3 Successful Payment**

### **Narrative**

As the system, I want to update contribution records when payment succeeds.

### **Acceptance Criteria**

For Equal Split:

* Participant status changes to Paid.  
* Contribution progress updates.

For Open Contribution:

* Contribution is recorded.  
* Remaining balance decreases.

## **6.4 Failed Payment**

### **Narrative**

As a participant, I want to retry payment if my transaction fails.

### **Acceptance Criteria**

* Failed payments are recorded.  
* Outstanding balances remain unchanged.  
* Participants can retry using the same active contribution link.

# **EPIC 7 – Contribution History**

## **7.1 Contribution Timeline**

### **Narrative**

As an organiser, I want to view the complete history of contribution activity.

### **Acceptance Criteria**

History includes:

* Plan creation  
* Recalculations  
* Payments  
* Manual adjustments  
* Link generation  
* Participant changes

## **7.2 Version History**

### **Narrative**

As an organiser, I want to review previous contribution plans.

### **Acceptance Criteria**

The organiser can:

* View every plan version.  
* Compare contribution allocations.  
* Review historical payment progress.

# **EPIC 8 – Notifications**

## **8.1 Send Contribution Requests**

### **Narrative**

As an organiser, I want participants to receive contribution invitations.

### **Acceptance Criteria**

Participants receive invitations when:

* A new Contribution Plan is published.  
* They are added to an Equal Split plan.

## **8.2 Send Payment Reminders**

### **Narrative**

As an organiser, I want to remind unpaid participants before the contribution deadline.

### **Acceptance Criteria**

* Reminders are sent only to Pending participants.  
* Reminder frequency is configurable.

# **EPIC 9 – Reporting**

## **9.1 Contribution Dashboard**

### **Narrative**

As an organiser, I want to monitor contribution progress.

### **Acceptance Criteria**

The dashboard displays:

* Booking Total  
* Total Collected  
* Remaining Balance  
* Number of Paid Participants  
* Number of Pending Participants  
* Contribution Percentage

# **EPIC 10 – Audit & Security**

## **10.1 Audit Trail**

### **Narrative**

As an administrator, I want all contribution activity recorded for compliance and support purposes.

### **Acceptance Criteria**

The system records:

* Plan creation  
* Plan publication  
* Participant additions  
* Participant removals  
* Contribution recalculations  
* Payments  
* Manual adjustments  
* Link invalidation  
* Status changes

# **Business Rules**

1. Completed payments are immutable.  
2. Previous contribution links become invalid when a new Contribution Plan is published.  
3. Every recalculation creates a new Contribution Plan version.  
4. Only outstanding balances are recalculated.  
5. Equal Split participants are manually managed by the organiser.  
6. Open Contribution does not support unpaid participant tracking.  
7. Hybrid mode supports both Equal Split and Open Contribution simultaneously.  
8. All contribution links first open the platform's Pre-Checkout page before redirecting to Stripe Checkout.  
9. The system performs calculations only; the organiser makes all contribution decisions.  
10. Contribution amounts must always reconcile exactly with the booking balance.

