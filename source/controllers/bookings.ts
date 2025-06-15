import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma'

interface Booking {
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "OK"
    })
}

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    const booking: Booking = req.body;

    let checkOutDate = await calculateCheckoutDate(booking.checkInDate, booking.numberOfNights);

    let outcome = await isBookingPossible(booking, checkOutDate);

    if (!outcome.result) {
        return res.status(400).json(outcome.reason);
    }

    let bookingResult = await prisma.booking.create({
        data: {
             guestName: booking.guestName,
             unitID: booking.unitID,
             checkInDate: new Date(booking.checkInDate),
             checkOutDate: checkOutDate,
             numberOfNights: booking.numberOfNights
       }
    })

    return res.status(200).json(bookingResult);
}

type bookingOutcome = {result:boolean, reason:string};

async function isBookingPossible(booking: Booking, checkOutDate: Date): Promise<bookingOutcome> {
    // check 1 : The Same guest cannot book the same unit multiple times
    let sameGuestSameUnit = await prisma.booking.findMany({
        where: {
            AND: {
                guestName: {
                    equals: booking.guestName,
                },
                unitID: {
                    equals: booking.unitID,
                },
            },
        },
    });
    if (sameGuestSameUnit.length > 0) {
        return {result: false, reason: "The given guest name cannot book the same unit multiple times"};
    }

    // check 2 : the same guest cannot be in multiple units at the same time
    let sameGuestAlreadyBooked = await prisma.booking.findMany({
        where: {
            guestName: {
                equals: booking.guestName,
            },
        },
    });
    if (sameGuestAlreadyBooked.length > 0) {
        return {result: false, reason: "The same guest cannot be in multiple units at the same time"};
    }

  // check 3 : Unit is available for the date range generated with the given check-in date
  let isUnitAvailableOnCheckInDate = await prisma.booking.findMany({
    where: {
      AND: [
        {
          unitID: {
            equals: booking.unitID,
          },
        },
        {
          checkInDate: {
            lt: new Date(checkOutDate),
          },
        },
        {
          checkOutDate: {
            gt: new Date(booking.checkInDate),
          },
        },
      ],
    },
  });
  
  if (isUnitAvailableOnCheckInDate.length > 0) {
        return {result: false, reason: "For the given check-in date, the unit is already occupied"};
    }

    return {result: true, reason: "OK"};
}

async function calculateCheckoutDate(startDate: Date, days: number): Promise<Date> {
    const checkOutDate = new Date(startDate);
    checkOutDate.setDate(checkOutDate.getDate() + days);
    return checkOutDate;
  }

export default { healthCheck, createBooking }
