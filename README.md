# Backend Challenge - TypeScript

> If you want, you may also complete this challenge in:
> [Python](https://github.com/limehome/backend-challenge-python)
> or
> [Java](https://github.com/limehome/backend-challenge-java)

## Context

We would like you to help us with a small service that we have for handling bookings. A booking for us simply tells us which guest will be staying in which unit, and when they arrive and the number of nights that guest will be enjoying our amazing suites, comfortable beds, great snac.. apologies - I got distracted. Bookings are at the very core of our business and it's important that we get these right - we want to make sure that guests always get what they paid for, and also trying to ensure that our unit are continually booked and have as few empty nights where no-one stays as possible. A unit is simply a location that can be booked, think like a hotel room or even a house. For the exercise today, we would like you to help us solve an issue we've been having with our example service, as well as implement a new feature to improve the code base. While this is an opportunity for you to showcase your skills, we also want to be respectful of your time and suggest spending no more than 3 hours on this (of course you may also spend longer if you feel that is necessary)

### You should help us:

Identify and fix a bug that we've been having with bookings - there seems to be something going wrong with the booking process where a guest will arrive at a unit only to find that it's already booked and someone else is there!
There are many ways to solve this bug - there is no single correct answer that we are looking for.

### Implement a new feature:

Allowing guests to extend their stays if possible. It happens that <strike>sometimes</strike> all the time people love staying at our locations so much that they want to extend their stay and remain there a while longer. We'd like a new API that will let them do that

While we provide a choice of projects to work with (either `TS`, `Python`, or `Java`), we understand if you want to implement this in something you're more comfortable with. You are free to re-implement the parts that we have provided in another language, however this may take some time and we would encourage you not spend more time than you're comfortable with!

When implementing, make sure you follow known best practices around architecture, testability, and documentation.

## How to run

### Prerequisutes

Make sure to have the following installed

- npm

### Setup

To get started, clone the repository locally and run the following

```shell
[~]$ ./init.sh
```

To make sure that everything is setup properly, open http://localhost:8000 in your browser and you should see an OK message.
The logs should be looking like this

```shell
The server is running on http://localhost:8000
GET / 200 3.088 ms - 16
```

To navigate to the swagger docs, open the url http://localhost:8000/api-docs/

### Running tests

There is one failing test, which is the first task of the challenge.
This test should pass - without changing the expected return code of course ;) - once you have fixed the bug.
If you need to change the format of the object, or the given interface, please ensure all tests still pass.

```shell
[~]$ npm run test
...
 FAIL  test/booking.test.ts
  Booking API
    ✓ Create fresh booking (52 ms)
    ✓ Same guest same unit booking (16 ms)
    ✓ Same guest different unit booking (12 ms)
    ✓ Different guest same unit booking (12 ms)
    ✕ Different guest same unit booking different date (13 ms)
...
Test Suites: 1 failed, 1 total
Tests:       1 failed, 4 passed, 5 total
Snapshots:   0 total
Time:        0.984 s, estimated 1 s
Ran all test suites.
```

## Update

### Bug

The root cause of the double-booking bug was the lack of proper validation for overlapping bookings. The booking API was not effectively checking if a unit was already booked for the requested date range before allowing a new booking, which caused guests to sometimes find their units occupied.

How I fixed it:

- **Calculated checkout date internally:** Instead of asking the client to provide the checkout date, I now calculate it in the backend using the check-in date and number of nights with a helper function called calculateCheckoutDate().

- **Overlap check for booking availability:** Before making a booking, I check if the requested unit is free for the entire stay. If there’s a conflict with any existing booking, it returns a failure message and the API responds with a 400 status and an explanation.
- **Assumptions:** The system operates under the assumption that it is acceptable for the check-in and checkout dates to be the same, allowing a guest to both check in and check out on the same day. Additionally, the system currently evaluates only full dates without taking the time of day into account, which is consistent with the original design.

### New feature:

A new PUT API endpoint has been implemented to allow guests to extend their existing bookings when the accommodation unit is available for the requested additional period.

##### API Endpoint

```
PUT /api/v1/booking/:id/extend
```

**Base URL:** `http://localhost:8000`

#### How It Works

The API receives the booking ID and a payload containing the guest name and the number of additional nights requested. It first validates whether the extension is possible by running several checks:

1. **Input Validation**: Confirms that the number of additional nights is provided
2. **Booking Existence**: Verifies the original booking exists in the system
3. **Checkout Status**: Ensures the booking is not overdue (past the original checkout date)
4. **Guest Authorization**: Confirms the requesting guest matches the original booking
5. **Availability Check**: Verifies no conflicting bookings exist for the extension period

#### API Documentation

For detailed request/response examples see the Swagger documentation at:

```
http://localhost:8000/api/v1/docs
```

#### Running tests

The failing test was slighly adjusted to adapt to new logic.
Tests have been updated to accommodate the new logic and include comprehensive testing to ensure the feature works seamlessly with existing booking functionality.
