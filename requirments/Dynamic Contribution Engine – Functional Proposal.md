# **Dynamic Contribution Engine – Functional Proposal**

## **Overview**

The Dynamic Contribution Engine is designed to provide organisers with a flexible way of collecting payments for private hire bookings while accommodating booking changes throughout the booking lifecycle.

Rather than supporting a single payment model, the engine will provide three contribution strategies:

* Equal Split  
* Open Contribution  
* Hybrid (Combination of Equal Split and Open Contribution)

The organiser remains in complete control of how contributions are managed, while the system is responsible for calculations, payment processing, and tracking.

# **Core Principles**

The Contribution Engine is based on the following principles:

* Completed payments are immutable and are never recalculated.  
* Only outstanding contribution requirements may change.  
* Every contribution plan has its own version.  
* Previous contribution links become invalid once a new contribution plan is published.  
* The system performs calculations but never makes financial decisions on behalf of the organiser.

# **Contribution Modes**

## **1\. Equal Split**

The Equal Split mode is designed for organisers who want to track individual participant payments.

### **Process**

1. The organiser manually enters all participants.  
2. The system divides the booking amount equally between them.  
3. A unique contribution link is generated for each participant.  
4. Each participant receives their own payment link.  
5. Every participant is initially marked as **Pending**.  
6. After successful payment, the participant status changes to **Paid**.

### **Advantages**

* Individual payment tracking.  
* Easy identification of unpaid participants.  
* Reminder notifications can be sent to specific participants.  
* Complete payment visibility for the organiser.

## **2\. Open Contribution**

Open Contribution is intended for situations where the organiser does not need to track who has or has not contributed.

### **Process**

1. The organiser creates a single public contribution link.  
2. No participant records are created in advance.  
3. Anyone with the link may contribute any amount.  
4. Every successful payment is recorded as it is received.  
5. The remaining booking balance is updated automatically.

### **Characteristics**

* No participant management.  
* No pending participant list.  
* No unpaid participant tracking.  
* Suitable for informal groups where contribution tracking is unnecessary.

## **3\. Hybrid Contribution**

The organiser may combine both approaches.

For example:

* Create Equal Split invitations for close friends or confirmed travellers.  
* Generate an Open Contribution link for anyone else wishing to contribute.

This provides both structured payment tracking and flexible community contributions within the same booking.

# **Contribution Recalculation**

Private hire bookings frequently change.

Examples include:

* Passenger cancellations  
* New passengers joining  
* Booking value changes  
* Vehicle changes  
* Route changes

Whenever a booking changes, the organiser may publish a new Contribution Plan.

When this occurs:

* Previous contribution links become invalid.  
* A new Contribution Plan version is created.  
* New contribution links are generated.  
* Completed payments remain unchanged.  
* Only outstanding balances are recalculated.

# **Reallocation Options**

During recalculation, the organiser decides how the remaining balance should be handled.

Available options include:

* Redistribute the remaining balance equally.  
* Manually assign different amounts to selected participants.  
* Allocate the remaining balance to one or more participants.  
* Continue collecting through an Open Contribution link.  
* Use any combination of the above.

The Contribution Engine never performs these decisions automatically.

# **Payment Flow**

Both Equal Split and Open Contribution follow the same payment experience.

### **Step 1**

The participant opens their Contribution Link.

### **Step 2**

The user is presented with a platform-hosted **Pre-Checkout Page** displaying:

* Booking summary  
* Contribution amount (or remaining balance for Open Contribution)  
* Contribution details  
* Payment confirmation

### **Step 3**

After confirming, the participant is redirected to **Stripe Checkout**.

### **Step 4**

Stripe processes the payment securely.

### **Step 5**

Following a successful payment:

For **Equal Split**:

* Participant status changes from **Pending** to **Paid**.  
* Payment progress is updated.  
* The organiser can immediately see who has and has not paid.

For **Open Contribution**:

* The payment is recorded.  
* The booking's remaining balance is reduced.  
* A contributor record is created for audit purposes.  
* Since participants are not pre-registered, unpaid contributors cannot be tracked.

# **Contribution Plan Versioning**

Each time the organiser republishes contribution allocations, a new Contribution Plan is created.

Every plan maintains its own:

* Participant allocations  
* Contribution links  
* Payment progress  
* Outstanding balances  
* Activity history

This provides complete historical visibility while ensuring previous financial records remain unchanged.

# **Benefits**

The proposed Contribution Engine provides:

* Full organiser control over contribution strategies.  
* Support for Equal Split, Open Contribution, and Hybrid contribution models.  
* Individual payment tracking where required.  
* Flexible open fundraising when participant tracking is unnecessary.  
* Immutable payment history.  
* Version-controlled contribution plans.  
* Automatic invalidation of outdated payment links.  
* A consistent payment journey through the platform's Pre-Checkout page before redirecting to Stripe Checkout.  
* A reusable architecture that can be adopted across multiple products and business models.

Miro Workflow: [Davelong-public » Diagram](https://miro.com/app/board/uXjVH7xOz4M=/?moveToWidget=3458764678615627608&cot=14)