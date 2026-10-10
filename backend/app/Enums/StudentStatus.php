<?php

namespace App\Enums;

enum StudentStatus: string
{
    case Active = 'active';
    case Transferred = 'transferred';
    case Dropped = 'dropped';
    case Graduated = 'graduated';
    case Inactive = 'inactive';
}
