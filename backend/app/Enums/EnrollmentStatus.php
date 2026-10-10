<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Active = 'active';
    case Promoted = 'promoted';
    case Retained = 'retained';
    case Graduated = 'graduated';
    case Left = 'left';
}
