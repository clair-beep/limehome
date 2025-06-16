import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

interface Booking {
  guestName: string;
  unitID: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
}

interface ExtendBooking {
  guestName: string;
  additionalNights: number;
}

interface BookingExtensionValidation {
  bookingId: number;
  guestName: string;
  numberOfNights: number;
}

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json({
    message: 'OK',
  });
};

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
      numberOfNights: booking.numberOfNights,
    },
  });

  return res.status(200).json(bookingResult);
};

const extendBooking = async (req: Request, res: Response, next: NextFunction) => {
  const bookingId = parseInt(req.params.id, 10);
  const extendBooking: ExtendBooking = req.body;

  const outcome = await isExtensionPossible({
    numberOfNights: extendBooking.additionalNights,
    guestName: extendBooking.guestName,
    bookingId,
  });

  if (!outcome.result) {
    return res.status(400).json(outcome.reason);
  }

  const existingBooking = outcome.booking!;
  const newCheckOutDate = await calculateCheckoutDate(existingBooking.checkOutDate, extendBooking.additionalNights);
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      numberOfNights: existingBooking.numberOfNights + extendBooking.additionalNights,
      checkOutDate: newCheckOutDate,
    },
  });

  return res.status(200).json(updatedBooking);
};

type bookingOutcome = { result: boolean; reason: string };
type extendBookingOutcome = { result: boolean; reason: string; booking?: Booking };

async function isExtensionPossible(extensionRequest: BookingExtensionValidation): Promise<extendBookingOutcome> {
  // Check 1: validate aditional nights is a valid number
  if (!extensionRequest.numberOfNights || extensionRequest.numberOfNights <= 0) {
    return { result: false, reason: 'Please provide a valid number of additional nights' };
  }

  // check 2: find existing booking
  const existingBooking = await prisma.booking.findUnique({ where: { id: extensionRequest.bookingId } });
  if (!existingBooking) {
    return { result: false, reason: 'Booking not found' };
  }

  // check 3: Check if booking is overdue
  if (existingBooking.checkOutDate < new Date()) {
    return { result: false, reason: 'Cannot extend a booking that has already ended.' };
  }

  // check 4 :the same guest is the one doing the request to extend
  let sameGuestAlreadyBooked = await prisma.booking.findFirst({
    where: {
      unitID: existingBooking.unitID,
      guestName: extensionRequest.guestName,
    },
  });

  if (!sameGuestAlreadyBooked) {
    return { result: false, reason: 'The same guest must be the one requesting the extended booking.' };
  }

  const newCheckOutDate = await calculateCheckoutDate(existingBooking.checkOutDate, extensionRequest.numberOfNights);

  // check 5 : Unit is available for the new checkout date
  let isUnitAvailableOnCheckInDate = await prisma.booking.findMany({
    where: {
      AND: [
        {
          unitID: {
            equals: existingBooking.unitID,
          },
        },
        {
          checkInDate: {
            lt: newCheckOutDate,
          },
        },
        {
          checkOutDate: {
            gt: existingBooking.checkOutDate,
          },
        },
      ],
    },
  });

  if (isUnitAvailableOnCheckInDate.length > 0) {
    return { result: false, reason: 'The unit is not available for the extended stay period.' };
  }

  return { result: true, reason: 'OK', booking: existingBooking };
}

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
    return { result: false, reason: 'The given guest name cannot book the same unit multiple times' };
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
    return { result: false, reason: 'The same guest cannot be in multiple units at the same time' };
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
    return { result: false, reason: 'For the given check-in date, the unit is already occupied' };
  }

  return { result: true, reason: 'OK' };
}

async function calculateCheckoutDate(startDate: Date, days: number): Promise<Date> {
  const checkOutDate = new Date(startDate);
  checkOutDate.setDate(checkOutDate.getDate() + days);
  return checkOutDate;
}

export default { healthCheck, createBooking, extendBooking };
