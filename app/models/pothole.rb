require 'concerns/TimeParser'

class Pothole < ApplicationRecord
  include ::TimeParser

  acts_as_mappable lat_column_name: :latitude,
                   lng_column_name: :longitude

  def self.excluding_fixed exclude
    if exclude
    then self.where(fixed_at: nil)
    else self
    end
  end

  def self.markers_in_bounds bounds
    self
      .in_bounds(bounds)
      .map do |pothole|
        {
          'id': pothole.id,
          'lat': pothole.latitude,
          'lng': pothole.longitude,
          'category': pothole.category,
          'label': pothole.time_unfixed_label,
          'alertLevel': pothole.alert_level,
          'fixed': !pothole.fixed_at.nil?
        }
      end
  end

  def time_unfixed
    end_time = fixed_at || Time.now
    end_time - created_at
  end

  def time_unfixed_label
    time = time_unfixed.to_i.round
    days = time / 1.day
    hours = ( time - days * 1.day ) / 1.hour
    minutes = ( time - days * 1.day - hours * 1.hour ) / 1.minute

    if days <= 99
    then "%02d:%02d:%02d" % [days, hours, minutes]
    else "%d days" % days
    end
  end

  def alert_level
    unfixed = time_unfixed

    case
    when unfixed > parse_time(Settings.alert_levels[4])
      4
    when unfixed > parse_time(Settings.alert_levels[3])
      3
    when unfixed > parse_time(Settings.alert_levels[2])
      2
    else
      1
    end
  end
end
